import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// POST /api/location — update student team live GPS position
export const Route = createFileRoute("/api/location")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            teamId?: number | string;
            teamName?: string;
            checkpointId?: number | string;
            lat?: number;
            lng?: number;
          };

          if (!body.lat || !body.lng) {
            return Response.json({ error: "lat and lng are required" }, { status: 400 });
          }

          // Resolve team
          let team: any = null;
          const numTeamId = Number(body.teamId);
          if (!isNaN(numTeamId) && numTeamId > 0) {
            const { data } = await db.from("teams").select("*").eq("id", numTeamId).maybeSingle();
            team = data;
          }
          if (!team && body.teamName) {
            const { data } = await db.from("teams").select("*").ilike("name", body.teamName.trim()).maybeSingle();
            team = data;
          }

          if (!team) return Response.json({ success: false, reason: "team not found" });

          // Resolve checkpoint
          let cpId = Number(body.checkpointId);
          if (isNaN(cpId) || cpId <= 0) {
            const { data: firstCp } = await db.from("checkpoints").select("id").eq("session_id", team.session_id).limit(1).maybeSingle();
            cpId = firstCp?.id || 1;
          }

          // Check if checkpoint exists in DB
          const { data: cp } = await db.from("checkpoints").select("id").eq("id", cpId).maybeSingle();
          if (!cp) {
            const { data: fallbackCp } = await db.from("checkpoints").select("id").eq("session_id", team.session_id).limit(1).maybeSingle();
            if (fallbackCp) cpId = fallbackCp.id;
          }

          // Upsert into task_cache
          const payload = {
            checkpoint_id: cpId,
            team_id: team.id,
            task_json: {
              lat: body.lat,
              lng: body.lng,
              updated_at: new Date().toISOString(),
              team_name: team.name,
            },
          };

          const { data: existing } = await db.from("task_cache").select("id").eq("checkpoint_id", cpId).eq("team_id", team.id).maybeSingle();
          if (existing) {
            await db.from("task_cache").update({ task_json: payload.task_json }).eq("id", existing.id);
          } else {
            await db.from("task_cache").insert(payload);
          }

          return Response.json({ success: true, teamId: team.id });
        } catch (err: any) {
          console.warn("Location update failed:", err);
          return Response.json({ success: false, error: err?.message });
        }
      },
    },
  },
});
