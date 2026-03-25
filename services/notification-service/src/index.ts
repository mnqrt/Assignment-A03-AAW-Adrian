import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { startConsumer } from "./consumer";
import { db } from "./db";
import { notifications } from "./db/schema";

export const wsConnections = new Set<any>();

const app = new Elysia()
  .use(swagger({
      documentation: {
        info: {
          title: 'Notification Service API',
          description: 'Microservice for handling notifications with WebSocket support',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:3003',
            description: 'Development server'
          }
        ],
        tags: [
          {
            name: 'Health',
            description: 'Service health check endpoints'
          },
          {
            name: 'Notifications',
            description: 'Notification management endpoints'
          },
          {
            name: 'WebSocket',
            description: 'Real-time WebSocket endpoint (not documented in Swagger)'
          }
        ]
      }
    }))
  .ws('/ws', {
    open(ws) {
      wsConnections.add(ws);
      console.log('WebSocket client connected. Total connections:', wsConnections.size);

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to notification service'
      }));
    },
    close(ws) {
      wsConnections.delete(ws);
      console.log('WebSocket client disconnected. Total connections:', wsConnections.size);
    },
    message(ws, message) {
      console.log('Received message:', message);
    }
  })
  .get("/health", () => ({ status: "ok", service: "notification-service" }))
  .get("/api/notifications", async () => {
    try {
      const allNotifications = await db
        .select()
        .from(notifications);

      return allNotifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return { error: "Failed to fetch notifications" };
    }
  })
  .listen(3003);

startConsumer().catch(console.error);

console.log(`Notification Service running on port ${app.server?.port}`);
console.log(`WebSocket endpoint: ws://localhost:${app.server?.port}/ws`);