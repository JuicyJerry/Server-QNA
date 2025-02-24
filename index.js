const express = require("express");
const app = express();
const port = 5000;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { User } = require("./models/User");
const config = require("./config/key");
const { auth } = require("./middleware/auth");

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const mongoose = require("mongoose");
mongoose
  .connect(config.mongoUrI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Hello World! 새해복 많이 받으세요!!");
});

app.get("/api/hello", (req, res) => {
  res.send("안녕하십니까 행님");
});

app.post("/api/users/register", async (req, res) => {
  console.log("[Server/index/register] req ===> ", req.body);

  try {
    // 회원가입 할 때 필요한 정보들을 client에서 가져오면
    // 그것들을 데이터베이스에 넣어준다.
    const user = new User(req.body);
    console.log("[Server/index/register] user ===> ", user);
    await user.save();
    return res.status(200).json({ registerSuccess: true });
  } catch (err) {
    console.log("[Server/index/register] err ===> ", err);
    return res.status(400).json({ registerSuccess: false, error: err.message });
  }
});

app.post("/api/users/login", (req, res) => {
  //   console.log("[Server/index/register] login ===> ", req.body);

  // 1. 요청된 이메일을 데이터베이스에서 찾는다
  User.findOne({ email: req.body.email })
    .then((user) => {
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
      console.log("err ===> ", err);
      return res.json({
        loginSuccess: false,
        message: "제공된 이메일에 해당하는 유저가 없습니다.",
      });
    });
});

app.get("/api/users/auth", auth, (req, res) => {
  // 여기까지 미들웨어를 통과해 왔다는 얘기는 Authentication 이 True라는 말.
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

app.get("/api/users/logout", auth, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { token: "" }
    );
    // console.log("[logout] user ===> ", user);
    // console.log("[logout] res ===> ", res);

    return res.status(200).send({ logoutSuccess: true });
  } catch (err) {
    return res.json({ logoutSuccess: false, err });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
