import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// POST /api/sessions/:code/join — student team joins
export const Route = createFileRoute("/api/sessions/$code/join")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as { teamName?: string };
          const teamName = body.teamName?.trim();
          if (!teamName) return Response.json({ error: "Team name is required" }, { status: 400 });

          const code = params.code.toUpperCase();
          const { data: session } = await db
            .from("sessions")
            .select("*")
            .eq("join_code", code)
            .maybeSingle();
          if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
          if (session.status !== "active")
            return Response.json({ error: "This session has ended" }, { status: 400 });

          const { data: checkpoints } = await db
            .from("checkpoints")
            .select("*")
            .eq("session_id", session.id)
            .order("order_num", { ascending: true });
          if (!checkpoints || checkpoints.length === 0)
            return Response.json({ error: "Session has no checkpoints yet" }, { status: 400 });

          let { data: existingTeam } = await db
            .from("teams")
            .select("*")
            .eq("session_id", session.id)
            .ilike("name", teamName)
            .maybeSingle();

          let team = existingTeam;
          if (!team) {
            const { data: newTeam, error } = await db
              .from("teams")
              .insert({
                session_id: session.id,
                name: teamName,
                current_checkpoint: checkpoints[0]?.id || 1,
              })
              .select()
              .single();
            if (error) return Response.json({ error: error.message }, { status: 500 });
            team = newTeam;
          }

          return Response.json({ team, session: { ...session, checkpoints } });
        } catch (err) {
          console.warn("POST /api/sessions/:code/join DB error, falling back to local:", err);
          return Response.json({ error: "Session not found" }, { status: 404 });
        }
      },
    },
  },
});
