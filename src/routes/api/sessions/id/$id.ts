import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// GET /api/sessions/id/:id — full detail (teacher dashboard)
export const Route = createFileRoute("/api/sessions/id/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let session = null;
        const rawParam = params.id ? String(params.id).trim() : "";
        const numId = Number(rawParam);

        if (!isNaN(numId) && numId > 0) {
          const { data } = await db.from("sessions").select("*").eq("id", numId).maybeSingle();
          session = data;
        }

        if (!session) {
          const code = (!rawParam || rawParam === "undefined" || rawParam.startsWith("edutech_host") ? "EDUTECH26" : rawParam).toUpperCase();
          const { data } = await db.from("sessions").select("*").eq("join_code", code).maybeSingle();
          session = data;
        }

        // Ultimate fallback for the EduTech orientation session
        if (!session) {
          const { data } = await db.from("sessions").select("*").eq("join_code", "EDUTECH26").maybeSingle();
          session = data;
        }

        if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
        const id = session.id;

        const { data: checkpoints } = await db
          .from("checkpoints")
          .select("*")
          .eq("session_id", id)
          .order("order_num", { ascending: true });

        const cpList = checkpoints ?? [];
        const cpMap = new Map(cpList.map((cp: any) => [cp.id, cp]));

        const { data: rawTeams } = await db
          .from("teams")
          .select("*")
          .eq("session_id", id)
          .order("id", { ascending: true });

        const teams = await Promise.all(
          (rawTeams ?? []).map(async (team) => {
            const { data: completions } = await db
              .from("task_completions")
              .select("*")
              .eq("team_id", team.id);

            const { data: cacheRow } = await db
              .from("task_cache")
              .select("task_json")
              .eq("team_id", team.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const liveLat = cacheRow?.task_json?.lat;
            const liveLng = cacheRow?.task_json?.lng;

            const flat = (completions ?? [])
              .map((c: any) => {
                const matchedCp = cpMap.get(c.checkpoint_id) || cpList.find((cp: any) => cp.order_num === c.checkpoint_id);
                return {
                  ...c,
                  order_num: matchedCp?.order_num ?? c.checkpoint_id ?? 1,
                  task_type: matchedCp?.task_type ?? "creative",
                  difficulty: matchedCp?.difficulty ?? "easy",
                  label: matchedCp?.label ?? `Station ${c.checkpoint_id}`,
                };
              })
              .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

            return { ...team, lat: liveLat, lng: liveLng, completions: flat };
          }),
        );

        return Response.json({ ...session, checkpoints: cpList, teams });
      },
    },
  },
});
