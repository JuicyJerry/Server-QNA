import express from "express";

export interface UserType {
  _id: string;
  role: number;
  email: string;
  name: string;
  password: string;
  lastname: string;
  image: string;
  token: string;
  tokenExp: number;
  comparePassword(
    plainPassword: string,
    cb: (err: any, isMatch: boolean) => void
  ): void;
  generateToken(cb: (err: any, user: UserType) => void): void;
  findOne(userInfo: { _id: string; token: string }): Promise<UserType | null>;
  findByToken(token: string, cb: (err: any, user: UserType) => void): void;
}

export interface UserDocument extends UserType {
  isModified: (path: string) => boolean;
}

export interface AuthRequest extends express.Request {
  user: UserType;
  token: string;
}
