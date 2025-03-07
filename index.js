const express = require("express");
const app = express();
const port = 5000;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { User } = require("./models/User");
const config = require("./config/key");
const { auth } = require("./middleware/auth");
const axios = require("axios");
const {
  sendVerificationCode,
  verifyCode,
} = require("./middleware/authController.js");

require("dotenv").config();
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

const createPublicKey = (publicKey) => {
  const jwk = {
    kty: "RSA",
    n: publicKey.n,
    e: publicKey.e,
  };

  return jwkToPem(jwk);
};

// Google 로그인 처리
app.post("/api/users/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    // console.log("[google-login] check ===> ");

    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/certs"
    );
    const publicKeys = response.data.keys;

    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded.header.kid;

    const publicKey = publicKeys.find((key) => key.kid === kid);
    if (!publicKey) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: public key not found",
      });
    }

    // RSA 공개 키 생성
    const rsaPublicKey = createPublicKey(publicKey);

    // JWT 검증
    const verified = jwt.verify(token, rsaPublicKey, { algorithms: ["RS256"] });
    try {
      const verified = jwt.verify(token, rsaPublicKey, {
        algorithms: ["RS256"],
      });
      // console.log("[google-login] verified decoded ===> ", verified);

      // 이후 사용자 정보 처리
    } catch (error) {
      // console.error("Error during token verification:", error);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    // 사용자 정보 찾기
    let user = await User.findOne({ email: verified.email });
    // console.log("[google-login] user ===> ", user);
    if (!user) {
      user = new User({
        email: verified.email,
        name: verified.name,
        // 필요한 추가 정보 입력
      });
      // console.log("user info 1 ====> ", user);
      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);
        // 토큰 저장 : 쿠키, 로컬 스토리지
        res.cookie("x_auth", user.token).status(200).json({
          loginSuccess: true,
          userId: user._id,
        });
      });
      await user.save(); // DB에 사용자 정보 저장
      // console.log("user info 2 ====> ", user);
      // console.log("req.cookies 2 ====> ", req.cookies);
    }

    // console.log("user info 3 ====> ", user);
    // console.log("req.cookies 3 ====> ", req.cookies);
    // console.log("req.session 1 ====> ", req.session);
    // 세션에 사용자 정보 저장
    req.session.user = user; // 세션에 사용자 정보 저장
    // console.log("req.session 2 ====> ", req.session);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        // 필요한 추가 정보
      },
    });
  } catch (error) {
    // console.error("Error during token verification:", error);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
});

const mongoose = require("mongoose");
mongoose.connect(config.mongoUrI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃 설정
  socketTimeoutMS: 45000, // 소켓 연결 타임아웃 설정
});
// .then(() => console.log("MongoDB Connected..."))
// .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World! 새해복 많이 받으세요!!");
});

app.get("/api/hello", (req, res) => {
  res.send("안녕하십니까 행님");
});

app.post("/api/users/register", async (req, res) => {
  // console.log("[Server/index/register] req ===> ", req.body);

  try {
    // 회원가입 할 때 필요한 정보들을 client에서 가져오면
    // 그것들을 데이터베이스에 넣어준다.
    const user = new User(req.body);
    // console.log("[Server/index/register] user ===> ", user);
    await user.save();
    return res.status(200).json({ registerSuccess: true });
  } catch (err) {
    // console.log("[Server/index/register] err ===> ", err);
    return res.status(400).json({ registerSuccess: false, error: err.message });
  }
});

app.post("/api/users/login", (req, res) => {
  // console.log("[Server/index] login ===> ", req.body);

  // 1. 요청된 이메일을 데이터베이스에서 찾는다
  User.findOne({ email: req.body.email })
    .then((user) => {
      // console.log("[Server/index] login2 ===> ", req.body);
      // 2. 요청된 이메일이 데이터베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인
      user.comparePassword(req.body.password, (err, isMatch) => {
        // console.log("[Server/index] isMatch ===> ", isMatch);
        if (!isMatch)
          return res.json({
            loginSuccess: false,
            message: "비밀번호가 틀렸습니다.",
          });
        // 3. 비밀번호까지 맞다면 토큰을 생성하기
        user.generateToken((err, user) => {
          if (err) return res.status(400).send(err);
          // 토큰 저장 : 쿠키, 로컬 스토리지
          res.cookie("x_auth", user.token).status(200).json({
            loginSuccess: true,
            userId: user._id,
          });
        });
      });
    })
    .catch((err) => {
      // console.log("err ===> ", err);
      return res.json({
        loginSuccess: false,
        message: "제공된 이메일에 해당하는 유저가 없습니다.",
      });
    });
});

app.get("/api/users/auth", auth, (req, res) => {
  // 여기까지 미들웨어를 통과해 왔다는 얘기는 Authentication 이 True라는 말.?? 아닐지도
  console.log("[index]/api/users/auth (res) ---> ", res.user);

  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
  });
});

app.get("/api/users/logout", async (req, res) => {
  try {
    // console.log("[logout] req.user ===> ", req.user);
    // const user = await User.findOneAndUpdate(
    //   { _id: req.user._id },
    //   { token: "" }
    // );
    // console.log("[logout] user ===> ", user);
    // console.log("[logout] res ===> ", res);

    if (req.user) {
      await User.findOneAndUpdate({ _id: req.user._id }, { token: "" });
      // console.log("[logout] Token cleared in DB");
    } else {
      // console.log("[logout] No user, skipping DB update");
    }

    res.clearCookie("x_auth", { path: "/" }); // 클라이언트 쿠키 삭제
    return res.status(200).json({ logoutSuccess: true });
  } catch (err) {
    // console.log("[logout] err ===> ", err);
    return res.status(500).json({ logoutSuccess: false, error: err.message });
  }
});

app.listen(port, () => {
  // console.log(`Example app listening on port ${port}`);
});
