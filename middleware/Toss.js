import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const TOSS_CLIENT_KEY = process.env.TOSS_CLIENT_KEY;
const REDIRECT_URL = "http://localhost:3000/signup-success"; // 인증 완료 후 이동할 URL

// 📌 토스 인증 요청 API
router.post("/auth/toss-request", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.tosspayments.com/v1/auth/authorize",
      {
        clientKey: TOSS_CLIENT_KEY,
        redirectUrl: REDIRECT_URL,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ authUrl: response.data.authUrl });
  } catch (error) {
    console.error("토스 인증 요청 실패:", error);
    res.status(500).json({ message: "토스 인증 요청 실패" });
  }
});

// 📌 토스 인증 콜백 API (인증 결과 확인)
router.get("/auth/toss-callback", async (req, res) => {
  const { requestId, authKey } = req.query;

  if (!requestId || !authKey) {
    return res.status(400).json({ message: "잘못된 인증 요청입니다." });
  }

  try {
    const verifyResponse = await axios.post(
      "https://api.tosspayments.com/v1/auth/verify",
      {
        clientKey: TOSS_CLIENT_KEY,
        requestId,
        authKey,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (verifyResponse.data.success) {
      res.redirect("/signup-success"); // 인증 성공 후 이동
    } else {
      res.redirect("/
