import mongoose from "mongoose";
import request from "supertest";
import { createApp, RedisClient } from "../app";
import * as redis from "redis";
import dotenv from "dotenv";
dotenv.config();

let app: Express.Application;
let client: RedisClient;
const { LIST_KEY } = process.env;
const REDIS_URL = "redis://default:test_env@localhost:6380";
// 테스트 코드에서는 process.env.REDIS_URL을 사용하지 않음 : 실수로 테스트 코드 돌렸다가 prod나 local의 db 날림을 방지하기 위해

beforeAll(async () => {
  console.log("[beforeAll]List Key: ", LIST_KEY);
  client = redis.createClient({ url: REDIS_URL });
  await client.connect();
  app = createApp(client);
});

beforeEach(async () => {
  await client.flushDb();
});

describe("POST", () => {
  it("respond with a success message", async () => {
    const response = await request(app)
      .post("/messages")
      .send({ message: "testing with redis" });

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("Message added to list");
  });

  describe("GET", () => {
    it("respond with all messages", async () => {
      console.log("[GET]List Key: ", LIST_KEY);
      if (LIST_KEY) {
        console.log("[GET]List Key2 : ", LIST_KEY);
        await client.lPush(LIST_KEY, ["msg1", "msg2"]);
      } else {
        throw new Error("LIST_KEY is not defined");
      }
      const response = await request(app).get("/messages");

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(["msg2", "msg1"]);
    });
  });

  afterAll(async () => {
    console.log("Closing Redis connection...");
    await client.flushDb();
    await client.quit();
    console.log("Redis connection closed.");
    console.log("Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  });
});
