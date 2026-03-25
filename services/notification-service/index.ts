import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { startConsumer } from "./src/consumer";
import { db } from "./src/db";
import { notifications } from "./src/db/schema";

const NotificationResponse = t.Object({
  id: t.String({ format: "uuid" }),
  orderId: t.String({ format: "uuid" }),
  type: t.String(),
  recipient: t.String(),
  message: t.String(),
  sentAt: t.String(),
});

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "Notification Service API",
          version: "1.0.0",
          description: "API for managing order notifications",
        },
      },
    })
  )
  .get("/health", () => ({ status: "ok", service: "notification-service" }), {
    detail: {
      summary: "Health check",
      tags: ["Health"],
    },
  })
  .get("/api/notifications", async () => db.select().from(notifications), {
    detail: {
      summary: "Get all notifications",
      description: "Returns a list of all notifications that have been sent",
      tags: ["Notifications"],
    },
    response: t.Array(NotificationResponse),
  })
  .listen(3003);

startConsumer().catch(console.error);

console.log(`Notification Service running on port ${app.server?.port}`);