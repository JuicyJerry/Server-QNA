const twilio = require("twilio");
require("dotenv").config();

console.log(
  "process.env.TWILIO_ACCOUNT_SID ---> ",
  process.env.TWILIO_ACCOUNT_SID
);
console.log(
  "process.env.TWILIO_AUTH_TOKEN ---> ",
  process.env.TWILIO_AUTH_TOKEN
);
// Twilio 설정
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// let verificationCode: string | null = null; // 인증 코드
// let verificationCode = null; // 인증 코드

const formatPhoneNumber = (phoneNumber) => {
  // 01012345678 → +821012345678 로 변환
  if (phoneNumber.startsWith("0")) {
    return "+82" + phoneNumber.slice(1);
  }
  return phoneNumber; // 이미 국제번호 형식이면 그대로 사용
};

// 문자 발송 함수
// const sendVerificationCode = async (req: Request, res: Response) => {
const sendVerificationCode = async (req, res) => {
  let { phoneNumber } = req.body; // 사용자 전화번호
  phoneNumber = formatPhoneNumber(phoneNumber); // 국제번호 변환
  console.log("phoneNumber ---> ", phoneNumber);

  // 인증된 번호인지 확인 (예시)
  const verifiedNumbers = ["+821024348842"]; // 이 부분은 인증된 번호들로 바꿔주세요.
  if (!verifiedNumbers.includes(phoneNumber)) {
    return res.status(400).send({ message: "인증되지 않은 번호입니다." });
  }
  console.log("phoneNumber ---> ", phoneNumber);

  // 6자리 랜덤 인증 코드 생성
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString(); // 함수 내 지역 변수로만 사용
  console.log("verificationCode ---> ", verificationCode);

  try {
    // const verification = await client.verify.v2
    //   .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    //   .verifications.create({
    //     to: phoneNumber,
    //     channel: "sms",
    //   });

    res.status(200).send({
      message: "인증 코드가 전송되었습니다.",
      verificationCode: `${verificationCode}`,
      // status: `${verification.status} : ${verificationCode}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: `문자 발송 실패`, error });
  }
};

// 인증 코드 확인 함수
// const verifyCode = (req: Request, res: Response) => {
const verifyCode = (req, res) => {
  const { code } = req.body; // 사용자가 입력한 인증 코드

  if (verificationCode === code) {
    return res.status(200).send({ message: "인증 성공" });
  } else {
    return res.status(400).send({ message: "인증 실패" });
  }
};

// export { sendVerificationCode, verifyCode };
module.exports = { sendVerificationCode, verifyCode };
