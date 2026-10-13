import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// GET /api/sessions/id/:id — full detail (teacher dashboard)
export const Route = createFileRoute("/api/sessions/id/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let session = null;
        const numId = Number(params.id);
        if (!isNaN(numId) && numId > 0) {
          const { data } = await db.from("sessions").select("*").eq("id", numId).maybeSingle();
          session = data;
        } else {
          const code = (params.id?.startsWith('edutech_host') ? 'EDUTECH26' : params.id)?.toUpperCase();
          const { data } = await db.from("sessions").select("*").eq("join_code", code).maybeSingle();
          session = data;
        }
        if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
        const id = session.id;

        const { data: checkpoints } = await db
          .from("checkpoints")
          .select("*")
          .eq("session_id", id)
          .order("order_num", { ascending: true });

        const { data: rawTeams } = await db.from("teams").select("*").eq("session_id", id);

        const teams = await Promise.all(
          (rawTeams ?? []).map(async (team) => {
            const { data: completions } = await db
              .from("task_completions")
              .select(
                "*, checkpoints!inner(order_num,task_type,difficulty,label)",
              )
              .eq("team_id", team.id);
            const flat = (completions ?? [])
              .map((c: any) => ({
                ...c,
                order_num: c.checkpoints?.order_num,
                task_type: c.checkpoints?.task_type,
                difficulty: c.checkpoints?.difficulty,
                label: c.checkpoints?.label,
              }))
              .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
            return { ...team, completions: flat };
          }),
        );

        return Response.json({ ...session, checkpoints: checkpoints ?? [], teams });
      },
    },
  },
});
