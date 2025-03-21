import express from "express";
import { RedisClientType } from "redis";

require("dotenv").config();
const { LIST_KEY } = process.env;
import { AuthRequest } from "./types/index";

export type RedisClient = RedisClientType<any, any, any>;

export const createApp = (client: RedisClient) => {
  const app = express();
  //   const port = 5000;
  const cookieParser = require("cookie-parser");
  const bodyParser = require("body-parser");
  const { User } = require("./models/User");
  const config = require("./config/key");
  const { auth } = require("./middleware/auth");
  const axios = require("axios");
  // const {
  //   sendVerificationCode,
  //   verifyCode,
  // } = require("./middleware/authController.js");
  const { sendVerificationCode } = require("./middleware/authController");

  const cors = require("cors");
  app.use(
    cors({
      origin: "http://localhost:3000", // 프론트엔드 주소
      credentials: true,
    })
  );

  // google
  const jwt = require("jsonwebtoken");
  const router = express.Router();
  const session = require("express-session");

  app.use(
    session({
      secret: process.env.GOOGLE_CLIENT_SECRET, // 비밀 키
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // HTTPS를 사용하는 경우 true로 설정
    })
  );

  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cookieParser());

  const jwkToPem = require("jwk-to-pem"); // jwk-to-pem 패키지를 설치해야 합니다.

  const createPublicKey = (publicKey: {
    kty: string;
    n: string;
    e: string;
  }) => {
    const jwk = {
      kty: "RSA",
      n: publicKey.n,
      e: publicKey.e,
    };

    return jwkToPem(jwk);
  };

  // 인증번호
  app.post(
    // "/api/users/send-verification",
    "/send-verification",
    async (req: express.Request, res: express.Response) => {
      const number = req.body.phoneNumber;
      console.log("[send-verification] number ===> ", number);

      if (number) {
        sendVerificationCode(number);
      } else {
        res.status(400).send("Invalid phone number");
      }
    }
  );

  // Google 로그인 처리
  app.post(
    "/api/users/google-login",
    async (req: express.Request, res: express.Response) => {
      const { token } = req.body;

      try {
        // console.log("[google-login] check ===> ");

        const response = await axios.get(
          "https://www.googleapis.com/oauth2/v3/certs"
        );
        const publicKeys = response.data.keys;

        const decoded = jwt.decode(token, { complete: true });
        const kid = decoded.header.kid;

        const publicKey = publicKeys.find(
          (key: { kid: string }) => key.kid === kid
        );
        if (!publicKey) {
          return res.status(401).json({
            success: false,
            message: "Invalid token: public key not found",
          });
        }

        // RSA 공개 키 생성
        const rsaPublicKey = createPublicKey(publicKey);

        // JWT 검증
        const verified = jwt.verify(token, rsaPublicKey, {
          algorithms: ["RS256"],
        });
        try {
          const verified = jwt.verify(token, rsaPublicKey, {
            algorithms: ["RS256"],
          });
          console.log("[google-login] verified decoded ===> ", verified);

          // 이후 사용자 정보 처리
        } catch (error) {
          // console.error("Error during token verification:", error);
          return res
            .status(401)
            .json({ success: false, message: "Invalid token" });
        }

        // 사용자 정보 찾기
        let user = await User.findOne({ email: verified.email });
        console.log("[google-login] user ===> ", user);
        // console.log("user info 1 ====> ", user);
        user.generateToken((err: Error, user: typeof User) => {
          if (err) return res.status(400).send(err);
          if (!user) {
            user = new User({
              email: verified.email,
              name: verified.name,
              token: verified.token,
              // 필요한 추가 정보 입력
            });
          }
        });
        console.log("user info 1 ====> ");

        // 토큰 저장 : 쿠키, 로컬 스토리지
        res.cookie("x_auth", user.token).status(200).json({
          loginSuccess: true,
          userId: user._id,
        });

        // res.cookie 주석 처리 후, await user.save() 이후 아래 코드부터 동작 안 함
        // await user.save(); // DB에 사용자 정보 저장
        console.log("user info 2 ====> ");
        // console.log("req.cookies 2 ====> ", req.cookies);

        // console.log("user info 3 ====> ", user);
        // console.log("req.cookies 3 ====> ", req.cookies);
        // console.log("req.session 1 ====> ", req.session);
        // 세션에 사용자 정보 저장
        // req.session.user = user; // 세션에 사용자 정보 저장
        // console.log("req.session 2 ====> ", req.session);
        console.log("user info 3 ====> ");

        // 토큰 저장 : 쿠키, 로컬 스토리지
        // res.cookie("x_auth", user.token).status(200).json({
        //   loginSuccess: true,
        //   userId: user._id,
        //   id: user._id,
        //   email: user.email,
        //   name: user.name,
        // });
        console.log("user info 4 ====> ");

        // res.status(200).json({
        //   success: true,
        //   user: {
        //     id: user._id,
        //     email: user.email,
        //     name: user.name,
        //     // 필요한 추가 정보
        //   },
        // });
      } catch (error) {
        // console.error("Error during token verification:", error);
        return res
          .status(401)
          .json({ success: false, message: "Invalid token" });
      }
    }
  );

  // Kakao 로그인 처리
  app.post(
    "/api/users/kakao-login",
    async (req: express.Request, res: express.Response) => {
      const { token } = req.body;
      console.log("[kakao] token ---> ", token);
      try {
        // console.log("[google-login] check ===> ");

        const kakaoResponse = await axios.get(
          "https://kapi.kakao.com/v2/user/me",
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
            },
          }
        );
        console.log("[kakao-login] kakaoResponse ===>", kakaoResponse);

        const userInfo = kakaoResponse.data;
        console.log("[kakao-login] userInfo ===>", userInfo);

        // 이미 해당 이메일로 가입된 사용자 찾기
        let user = await User.findOne({ email: userInfo.kakao_account.email });
        console.log("[kakao-login] user 1 ===>", user);
        if (!user) {
          // 새로운 사용자 생성
          user = new User({
            email: userInfo.kakao_account.email,
            name: userInfo.properties.nickname,
            token: token.access_token,
            // 필요한 추가 정보 입력
          });
          console.log("[kakao-login] user 2 ===>", user);
          await user.save(); // 사용자 정보 저장
          console.log("[kakao-login] user 3 ===>", user);
        }

        // 로그인 후 JWT 생성
        user.generateToken((err: Error, user: typeof User) => {
          if (err) return res.status(400).send(err);

          // 토큰을 쿠키에 저장
          res.cookie("x_auth", user.token).status(200).json({
            loginSuccess: true,
            userId: user._id,
          });
        });
      } catch (error) {
        console.error("Error during Kakao login:", error);
        return res
          .status(401)
          .json({ success: false, message: "Invalid token" });
      }
    }
  );

  const mongoose = require("mongoose");
  // console.log("[Server/index] config.MONGO_URI ===> ", config.MONGO_URI);

  mongoose.connect(config.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃 설정
    socketTimeoutMS: 45000, // 소켓 연결 타임아웃 설정
  });
  // .then(() => console.log("MongoDB Connected..."))
  // .catch((err) => console.log(err));

  function fibonacci(n: number): number {
    if (n <= 1) {
      return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  app.get("/fibonacci/:n", (req: express.Request, res: express.Response) => {
    console.log(process.env.pm_id);
    const n = parseInt(req.params.n, 10);
    const result = fibonacci(n);
    res.send(`fibonacci of ${n} is ${result}`);
  });

  app.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).send("hello from express, deployed on AWS Lightsail!");
  });

  app.post(
    "/api/messages",
    async (req: express.Request, res: express.Response) => {
      console.log("[message/post] req.body ===> ", req.body);
      const { message } = req.body;
      console.log("[message/post] message ===> ", message);
      // console.log("[message/post] LIST_KEY ===> ", LIST_KEY);

      await client.lPush(LIST_KEY!, message);
      console.log("[message/post] message ===> ", message);
      res.status(200).send("Message added to list");
    }
  );

  app.get(
    "/api/messages",
    async (req: express.Request, res: express.Response) => {
      if (LIST_KEY === undefined) {
        res.status(500).send("[messages/get]LIST_KEY is not defined");
      } else {
        const messages = await client.lRange(LIST_KEY, 0, -1);
        console.log("[messages/get] messages ===> ", messages);
        res.status(200).send(messages);
      }
    }
  );

  app.get("/api/hello", (req: express.Request, res: express.Response) => {
    res.send("안녕하십니까 행님");
  });

  app.post(
    "/api/users/register",
    async (req: express.Request, res: express.Response) => {
      // console.log("[Server/index/register] req ===> ", req.body);

      try {
        // 회원가입 할 때 필요한 정보들을 client에서 가져오면
        // 그것들을 데이터베이스에 넣어준다.
        const user = new User(req.body);
        // console.log("[Server/index/register] user ===> ", user);
        await user.save();
        return res.status(200).json({ registerSuccess: true });
      } catch (err: Error | any) {
        // console.log("[Server/index/register] err ===> ", err);
        return res
          .status(400)
          .json({ registerSuccess: false, error: err.message });
      }
    }
  );

  app.post(
    "/api/users/login",
    (req: express.Request, res: express.Response) => {
      console.log("[Server/index] login ===> ", req.body);

      // 1. 요청된 이메일을 데이터베이스에서 찾는다
      User.findOne({ email: req.body.email })
        .then((user: typeof User) => {
          // console.log("[Server/index] login2 ===> ", req.body);
          // 2. 요청된 이메일이 데이터베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인
          user.comparePassword(
            req.body.password,
            (err: Error, isMatch: boolean) => {
              // console.log("[Server/index] isMatch ===> ", isMatch);
              if (!isMatch)
                return res.json({
                  loginSuccess: false,
                  message: "비밀번호가 틀렸습니다.",
                });
              // 3. 비밀번호까지 맞다면 토큰을 생성하기
              user.generateToken((err: Error, user: typeof User) => {
                if (err) return res.status(400).send(err);
                // 토큰 저장 : 쿠키, 로컬 스토리지
                res.cookie("x_auth", user.token).status(200).json({
                  loginSuccess: true,
                  userId: user._id,
                });
              });
            }
          );
        })
        .catch((err: Error | any) => {
          // console.log("err ===> ", err);
          return res.json({
            loginSuccess: false,
            message: "제공된 이메일에 해당하는 유저가 없습니다.",
          });
        });
    }
  );

  app.get("/api/users/auth", auth, (req, res) => {
    const request = req as AuthRequest;
    console.log("[index]/api/users/auth (req) ---> ", request.user);

    res.status(200).json({
      _id: request.user._id,
      isAdmin: request.user.role === 0 ? false : true,
      isAuth: true,
      email: request.user.email,
      name: request.user.name,
      lastname: request.user.lastname,
      role: request.user.role,
      image: request.user.image,
    });
  });

  app.get(
    "/api/users/logout",
    async (req: express.Request, res: express.Response) => {
      const request = req as AuthRequest;
      try {
        // console.log("[logout] req.user ===> ", req.user);
        // const user = await User.findOneAndUpdate(
        //   { _id: req.user._id },
        //   { token: "" }
        // );
        // console.log("[logout] user ===> ", user);
        // console.log("[logout] res ===> ", res);

        if (request.user) {
          await User.findOneAndUpdate({ _id: request.user._id }, { token: "" });
          // console.log("[logout] Token cleared in DB");
        } else {
          // console.log("[logout] No user, skipping DB update");
        }

        res.clearCookie("x_auth", { path: "/" }); // 클라이언트 쿠키 삭제
        return res.status(200).json({ logoutSuccess: true });
      } catch (err: Error | any) {
        // console.log("[logout] err ===> ", err);
        return res
          .status(500)
          .json({ logoutSuccess: false, error: err.message });
      }
    }
  );

  //   app.listen(port, () => {
  //     console.log(`Example app listening on port ${port}`);
  //   });
  return app;
};
