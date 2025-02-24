const { User } = require("../models/User");

let auth = (req, res, next) => {
  // 인증 처리하는 곳
  // 1. client 쿠키에서 토큰을 가져온다.
  let token = req.cookies.x_auth;
  // console.log("[auth1]User ===> ", User);
  // console.log("[auth1]token ===> ", token);

  // 2. 토큰을 복호화한 후 유저를 찾는다.
  User.findByToken(token, (err, user) => {
    // console.log("[auth2]err ===> ", err);
    // console.log("[auth2]user ===> ", user);
    // console.log("[auth2]token ===> ", token);
    // console.log("[auth2]!user ===> ", !user);
    if (err) throw err;
    if (!user) return res.json({ isAuth: false, error: true });
    // console.log("[auth3]user ===> ", user);

    req.token = token;
    req.user = user;
    next();
  });
};

module.exports = { auth };
