import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { db } from "./db";
import { orders } from "./db/schema";
import { eq } from "drizzle-orm";
import { publishEvent } from "./events";

const CATALOG_SERVICE_URL =
  process.env.CATALOG_SERVICE_URL || "http://localhost:3001";

interface CatalogLens {
  id: string;
  modelName: string;
  manufacturerName: string;
  dayPrice: string;
}

const LensSnapshotSchema = t.Object({
  modelName: t.String(),
  manufacturerName: t.String(),
  dayPrice: t.String(),
});

const OrderResponse = t.Object({
  id: t.String({ format: "uuid" }),
  customerName: t.String(),
  customerEmail: t.String(),
  lensId: t.String(),
  lensSnapshot: LensSnapshotSchema,
  startDate: t.String(),
  endDate: t.String(),
  totalPrice: t.String(),
  status: t.String(),
  createdAt: t.String(),
});

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: "[Service] Order",
          version: "1.0.0",
          description: "API for Lens Order Management",
        },
      },
    })
  )
  .post(
    "/api/orders",
    async ({ body }) => {
      const lensResponse = await fetch(
        `${CATALOG_SERVICE_URL}/api/lenses/${body.lensId}`,
      );
      if (!lensResponse.ok) {
        return new Response(JSON.stringify({ error: "Lens not found" }), {
          status: 404,
        });
      }
      const lens = (await lensResponse.json()) as CatalogLens;

      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days <= 0) {
        return new Response(
          JSON.stringify({ error: "End date must be after start date" }),
          { status: 400 },
        );
      }
      const totalPrice = (days * parseFloat(lens.dayPrice)).toFixed(2);

      const [order] = await db
        .insert(orders)
        .values({
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          lensId: body.lensId,
          lensSnapshot: {
            modelName: lens.modelName,
            manufacturerName: lens.manufacturerName,
            dayPrice: lens.dayPrice,
          },
          startDate: start,
          endDate: end,
          totalPrice,
        })
        .returning();
      if (!order) {
        return new Response(
          JSON.stringify({ error: "Failed to create order" }),
          { status: 500 },
        );
      }

      await publishEvent("order.placed", {
        orderId: order.id,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        lensName: lens.modelName,
      });

      return new Response(JSON.stringify(order), { status: 201 });
    },
    {
      body: t.Object({
        customerName: t.String(),
        customerEmail: t.String({ format: "email" }),
        lensId: t.String({ format: "uuid" }),
        startDate: t.String(),
        endDate: t.String(),
      }),
      detail: {
        summary: "Create a new order",
        description:
          "Creates a new lens rental order and publishes an order.placed event",
        tags: ["Orders"],
      },
      response: {
        201: OrderResponse,
        400: t.Object({ error: t.String() }),
        404: t.Object({ error: t.String() }),
        500: t.Object({ error: t.String() }),
      },
    }
  )
  .get("/api/orders", async () => db.select().from(orders), {
    detail: {
      summary: "Get all orders",
      description: "Returns a list of all orders",
      tags: ["Orders"],
    },
    response: t.Array(OrderResponse),
  })
  .get(
    "/api/orders/:id",
    async ({ params }) => {
      const results = await db
        .select()
        .from(orders)
        .where(eq(orders.id, params.id));
      if (!results[0]) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
        });
      }
      return results[0];
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        summary: "Get order by ID",
        description: "Returns a single order by its UUID",
        tags: ["Orders"],
      },
      response: {
        200: OrderResponse,
        404: t.Object({ error: t.String() }),
      },
    }
  )
  .get("/health", () => ({ status: "ok", service: "order-service" }), {
    detail: {
      summary: "Health check",
      tags: ["Health"],
    },
  })
  .listen(3002);

console.log(`Order Service running on port ${app.server?.port}`);
