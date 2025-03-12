const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
import { UserType, UserDocument } from "../types/index";

const userSchema = mongoose.Schema({
  name: {
    type: String,
    maxlength: 50,
  },
  email: {
    type: String,
    trim: true,
    unique: 1,
  },
  password: {
    type: String,
    minlength: 5,
  },
  lastname: {
    type: String,
    maxlength: 50,
  },
  role: {
    type: Number,
    default: 0,
  },
  image: String,
  token: {
    type: String,
  },
  tokenExp: {
    type: Number,
  },
});

// userSchema.pre("save", function (next: Function) {
userSchema.pre("save", function (this: UserDocument, next: Function) {
  let user = this;

  if (user.isModified("password")) {
    // 비밀번호를 암호화 시킨다.
    bcrypt.genSalt(saltRounds, function (err: Error, salt: string) {
      if (err) return next(err);
      bcrypt.hash(user.password, salt, function (err: Error, hash: string) {
        // Store hash in your password DB.
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

userSchema.methods.comparePassword = function (
  plainPassword: string,
  cb: (err: Error | null, isMatch?: boolean) => void
) {
  bcrypt.compare(
    plainPassword,
    this.password,
    function (err: Error | null, isMatch: boolean) {
      if (err) return cb(err);
      cb(null, isMatch);
    }
  );
};

userSchema.methods.generateToken = async function (
  cb: (err: Error | null, user?: UserType) => void
) {
  try {
    let user = this;
    // jsonwebtoken을 이용해 토큰 생성하기기
    // jwt.sign({ foo: 'bar' }, 'shhhhh')
    let token = jwt.sign(user._id.toHexString(), "secretToken");
    // console.log("[User.js]generateToken ===> ", token);
    user.token = token;
    await user.save();
    return cb(null, user);
  } catch (err) {
    return cb(err as Error);
  }
};

userSchema.statics.findByToken = async function (
  this: UserDocument,
  token: string,
  cb: (err: Error | null, user?: UserType) => void
) {
  let user = this;
  // 토큰을 decode한다.
  // console.log("[User.js]findByToken ===> token", token);

  // jwt.verify(token, process.env.GOOGLE_CLIENT_SECRET, function (err, decoded) {
  jwt.verify(token, "secretToken", function (err: Error, decoded: string) {
    // console.log("[User.js]findByToken ===> decoded", decoded);
    // 유저 아이디를 이용해서 유저를 찾은 다음에
    // 클라이언트에서 가져온 token과 DB에 보관된 토큰이 일치하는지 확인
    user
      .findOne({ _id: decoded, token: token })
      .then((user) => cb(null, user || undefined))
      .catch((err) => cb(err));
  });
};

const User = mongoose.model("User", userSchema);
module.exports = { User };
