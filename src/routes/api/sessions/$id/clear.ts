import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// POST /api/sessions/:id/clear — clear participants or photos from Supabase
export const Route = createFileRoute("/api/sessions/$id/clear")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const rawId = params.id ? String(params.id).trim() : "";
          let sessionId = Number(rawId);

          if (isNaN(sessionId) || sessionId <= 0) {
            const { data } = await db.from("sessions").select("id").eq("join_code", "EDUTECH26").maybeSingle();
            sessionId = data?.id || 10;
          }

          const body = (await request.json().catch(() => ({}))) as { photosOnly?: boolean };

          if (body.photosOnly) {
            const { data: teams } = await db.from("teams").select("id").eq("session_id", sessionId);
            const teamIds = (teams || []).map((t: any) => t.id);
            if (teamIds.length > 0) {
              await db.from("task_completions").delete().in("team_id", teamIds);
            }
          } else {
            // Deleting all teams for this session cascades to task_completions and task_cache
            await db.from("teams").delete().eq("session_id", sessionId);
          }

          return Response.json({ success: true, sessionId, photosOnly: Boolean(body.photosOnly) });
        } catch (err: any) {
          console.error("POST /api/sessions/:id/clear error:", err);
          return Response.json({ error: err?.message || "Failed to clear session data" }, { status: 500 });
        }
      },
    },
  },
});
