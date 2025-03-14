const { User } = require("../models/User");
import express from "express";
import { UserType, AuthRequest } from "../types";

let auth = (req: express.Request, res: express.Response, next: Function) => {
  const request = req as AuthRequest;

  // 인증 처리하는 곳
  // 1. client 쿠키에서 토큰을 가져온다.
  // let token = request.cookies.x_auth;
  let token =
    request.cookies.x_auth || request.headers.authorization?.split(" ")[1];
  console.log("[auth]User request.headers ===> ", request.headers);
  console.log("[auth]User token ===> ", token);
  // console.log("[auth1]request.cookies.x_auth===> ", request.cookies.x_auth);
  // console.log(
  //   "[auth1]token authorization ===> ",
  //   request.headers.authorization?.split(" ")[1]
  // );

  // if (!token) {
  //   // 토큰이 없는 경우에도 로그아웃 처리를 위해 next 호출
  //   // request.user = null;
  //   request.token = null;
  //   return next();
  // }
  console.log("[auth]!token ===> ", !token);
  if (!token) {
    return res.status(401).json({ isAuth: false, error: "token is not found" });
  }

  // 2. 토큰을 복호화한 후 유저를 찾는다.
  User.findByToken(token, (err: Error, user: UserType) => {
    console.log("[auth]user ===> ", user);
    // console.log("[auth2]token ===> ", token);
    // console.log("[auth2]!user ===> ", !user);

    // version1
    // if (!user) {
    //   // 유저가 없어도 로그아웃 처리를 위해 next 호출
    //   request.user = null;
    //   request.token = null;
    //   return next();
    // }
    // version2
    // if (!user) return res.json({ isAuth: false, error: true });
    // if (!user) {
    //   // console.log("[auth2] No user found, proceeding to next");
    //   request.user = null;
    //   request.token = null;
    //   return next(); // 유저 없어도 로그아웃 진행
    // }
    // console.log("[auth3]user ===> ", user);
    // console.log("[auth2] User found ===> ", user);

    if (user) {
      console.log("[auth]User request.user ===> ", request.user);
      console.log("[auth]User request.token ===> ", request.token);
      console.log("[auth]User user ===> ", user);
      request.token = user.token;
      request.user = user;
      next();
    }
  });
};
// };

module.exports = { auth };
