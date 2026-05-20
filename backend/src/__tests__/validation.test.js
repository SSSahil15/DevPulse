const request = require("supertest");
const express = require("express");
const { z } = require("zod");
const validate = require("../middleware/validate");

describe("Validation Middleware", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const testSchema = z.object({
      name: z.string().trim().min(3),
      age: z.number().int().min(18),
    });

    app.post("/test-body", validate(testSchema, "body"), (req, res) => {
      res.status(200).json({ data: req.body });
    });

    app.get("/test-query", validate(testSchema, "query"), (req, res) => {
      res.status(200).json({ data: req.query });
    });
  });

  it("should pass valid body", async () => {
    const res = await request(app)
      .post("/test-body")
      .send({ name: "Alice", age: 25 });
    
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Alice");
  });

  it("should fail invalid body with 400 and structured errors", async () => {
    const res = await request(app)
      .post("/test-body")
      .send({ name: "Al", age: 17 });
    
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(res.body.errors.length).toBe(2);
    expect(res.body.errors.some(e => e.field === "name")).toBeTruthy();
    expect(res.body.errors.some(e => e.field === "age")).toBeTruthy();
  });

  it("should fail on missing fields", async () => {
    const res = await request(app)
      .post("/test-body")
      .send({});
    
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBe(2);
  });
});
