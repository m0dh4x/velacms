import { auth } from "@vela/auth";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.json({ message: "Vela CMS API" }));
app.get("/health", (c) => c.json({ status: "ok" }));

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("🚀 Vela CMS API running on http://localhost:3000");
