import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { db } from "./db";
import { lenses } from "./db/schema";
import { eq } from "drizzle-orm";

const LensResponse = t.Object({
  id: t.String({ format: "uuid" }),
  modelName: t.String(),
  manufacturerName: t.String(),
  minFocalLength: t.Number(),
  maxFocalLength: t.Number(),
  maxAperture: t.String(),
  mountType: t.String(),
  dayPrice: t.String(),
  weekendPrice: t.String(),
  description: t.Nullable(t.String()),
});

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: "[Service] Catalog",
          version: "1.0.0",
          description: "API for Lens Management",
        },
      },
    })
  )
  .get("/api/lenses", async () => db.select().from(lenses), {
    detail: {
      summary: "Get all lenses",
      description: "Returns all avaliable lenses",
      tags: ["Lenses"],
    },
    response: t.Array(LensResponse),
  })
  .get(
    "/api/lenses/:id",
    async ({ params }) => {
      const results = await db
        .select()
        .from(lenses)
        .where(eq(lenses.id, params.id));
      if (!results[0]) {
        return new Response(JSON.stringify({ error: "Lens not found" }), {
          status: 404,
        });
      }
      return results[0];
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      detail: {
        summary: "Get lens by ID",
        description: "Returns a single lens by its unique UUID",
        tags: ["Lenses"],
      },
      response: {
        200: LensResponse,
        404: t.Object({ error: t.String() }),
      },
    }
  )
  .get("/health", () => ({ status: "ok", service: "catalog-service" }), {
    detail: {
      summary: "Health check",
      tags: ["Health"],
    },
  })
  .listen(3001);

console.log(`Catalog Service running on port ${app.server?.port}`);