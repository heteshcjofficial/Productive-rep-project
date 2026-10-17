const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

// Keep these tests deterministic and independent of a real Supabase project.
process.env.SUPABASE_URL = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.CORS_ORIGIN = "";

const app = require("../server.js");
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health check reports server uptime when Supabase is not configured", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "degraded");
  assert.equal(body.database.configured, false);
  assert.equal(body.database.connected, false);
  assert.equal(typeof body.timestamp, "string");
});

test("malformed JSON is rejected before database availability checks", async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"title":',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "invalid_json");
});

test("valid data operations report an actionable database-not-configured response", async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Plan the day", phase: "dawn", strain: "low", duration: "15m" }),
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, "database_not_configured");
});

test("unknown API routes return JSON 404 instead of the frontend page", async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "not_found");
});

test("disallowed cross-origin requests are rejected", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { origin: "https://unlisted.example" },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error, "cors_origin_denied");
});
