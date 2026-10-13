import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// POST /api/completions/delete — delete a completion or photo
export const Route = createFileRoute("/api/completions/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            id?: number | string;
            teamId?: number | string;
            checkpointId?: number | string;
          };

          if (body.id) {
            const numId = Number(body.id);
            if (!isNaN(numId) && numId > 0) {
              await db.from("task_completions").delete().eq("id", numId);
            }
          }

          if (body.teamId && body.checkpointId) {
            const numTeam = Number(body.teamId);
            const numCp = Number(body.checkpointId);
            if (!isNaN(numTeam) && !isNaN(numCp)) {
              await db.from("task_completions").delete().eq("team_id", numTeam).eq("checkpoint_id", numCp);
            }
          } else if (body.teamId && !body.checkpointId) {
            const numTeam = Number(body.teamId);
            if (!isNaN(numTeam)) {
              await db.from("task_completions").delete().eq("team_id", numTeam);
            }
          }

          return Response.json({ success: true });
        } catch (err: any) {
          console.error("POST /api/completions/delete error:", err);
          return Response.json({ error: err?.message || "Failed to delete completion" }, { status: 500 });
        }
      },
    },
  },
});
