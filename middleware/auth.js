const { User } = require("../models/User");

let auth = (req, res, next) => {
  // 인증 처리하는 곳
  // 1. client 쿠키에서 토큰을 가져온다.
  // let token = req.cookies.x_auth;
  let token = req.cookies.x_auth || req.headers.authorization?.split(" ")[1];
  // console.log("[auth1]User token ===> ", token);
  // console.log("[auth1]req.cookies.x_auth===> ", req.cookies.x_auth);
  // console.log(
  //   "[auth1]token authorization ===> ",
  //   req.headers.authorization?.split(" ")[1]
  // );

  if (!token) {
    // 토큰이 없는 경우에도 로그아웃 처리를 위해 next 호출
    // req.user = null;
    req.token = null;
    return next();
  }

  // 2. 토큰을 복호화한 후 유저를 찾는다.
  User.findByToken(token, (err, user) => {
    // console.log("[auth2]err ===> ", err);
    // console.log("[auth2]!user ===> ", !user);
    // console.log("[auth2]token ===> ", token);
    // console.log("[auth2]!user ===> ", !user);
    if (err) {
      // console.log("[auth2] Token verification error ===> ", err);
      return res.status(500).json({ isAuth: false, error: err.message });
    }
    // version1
    // if (!user) {
    //   // 유저가 없어도 로그아웃 처리를 위해 next 호출
    //   req.user = null;
    //   req.token = null;
    //   return next();
    // }
    // version2
    // if (!user) return res.json({ isAuth: false, error: true });
    if (!user) {
      // console.log("[auth2] No user found, proceeding to next");
      req.user = null;
      req.token = null;
      return next(); // 유저 없어도 로그아웃 진행
    }
    // console.log("[auth3]user ===> ", user);
    // console.log("[auth2] User found ===> ", user);
    req.token = token;
    req.user = user;
    next();
  });
};

module.exports = { auth };
