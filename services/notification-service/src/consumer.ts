import amqplib from "amqplib";
import { db } from "./db";
import { notifications } from "./db/schema";
import { wsConnections } from "./index";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "suilens.events";
const QUEUE_NAME = "notification-service.order-events";

export function broadcastNotification(notification: any) {
  const message = JSON.stringify({
    type: 'new_notification',
    data: notification
  });

  wsConnections.forEach((ws) => {
    try {
      ws.send(message);
    } catch (error) {
      console.error('Error sending to WebSocket client:', error);
      wsConnections.delete(ws);
    }
  });

  console.log(`Broadcasted notification to ${wsConnections.size} WebSocket clients`);
}

export async function startConsumer() {
  let retries = 0;
  const maxRetries = 10;
  const retryDelay = 2000;

  while (retries < maxRetries) {
    try {
      const connection = await amqplib.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "order.*");

      console.log(`Notification Service listening on queue: ${QUEUE_NAME}`);

      channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          console.log(`Received event: ${event.event}`, event.data);

          if (event.event === "order.placed") {
            const { orderId, customerName, customerEmail, lensName } =
              event.data;

            const notificationData = {
              orderId,
              type: "order_placed",
              recipient: customerEmail,
              message: `Hi ${customerName}, your rental order for ${lensName} has been placed successfully. Order ID: ${orderId}`,
            };

            const [savedNotification] = await db.insert(notifications).values(notificationData).returning();

            console.log(`Notification recorded for order ${orderId}`);

            broadcastNotification({
              ...savedNotification,
              customerName,
              lensName,
              eventData: event.data
            });
          }

          channel.ack(msg);
        } catch (error) {
          console.error("Error processing message:", error);
          channel.nack(msg, false, true);
        }
      });

      return;
    } catch (error) {
      retries++;
      console.warn(
        `Failed to connect to RabbitMQ (attempt ${retries}/${maxRetries}):`,
        (error as Error).message,
      );
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error(
    "Failed to connect to RabbitMQ after maximum retries. Continuing without consumer.",
  );
}