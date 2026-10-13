import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// DELETE /api/teams/:id — delete a student team and its completions
export const Route = createFileRoute("/api/teams/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        try {
          const rawId = params.id ? String(params.id).trim() : "";
          const numId = Number(rawId);

          if (!isNaN(numId) && numId > 0) {
            await db.from("teams").delete().eq("id", numId);
          } else if (rawId) {
            await db.from("teams").delete().ilike("name", rawId);
          }

          return Response.json({ success: true, deleted: rawId });
        } catch (err: any) {
          console.error("DELETE /api/teams/:id error:", err);
          return Response.json({ error: err?.message || "Failed to delete team" }, { status: 500 });
        }
      },
    },
  },
});
