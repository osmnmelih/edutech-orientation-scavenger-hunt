import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// GET /api/sessions/:code — fetch by join code (student join screen)
export const Route = createFileRoute("/api/sessions/$code")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const code = params.code.toUpperCase();
        const { data: session, error: sessionErr } = await db
          .from("sessions")
          .select("*")
          .eq("join_code", code)
          .maybeSingle();
        if (!session) {
          return Response.json({
            error: "Session not found",
            codeQueried: code,
            sessionErr: sessionErr?.message || sessionErr,
          }, { status: 404 });
        }

        const { data: checkpoints } = await db
          .from("checkpoints")
          .select("*")
          .eq("session_id", session.id)
          .order("order_num", { ascending: true });

        return Response.json({ ...session, checkpoints: checkpoints ?? [] });
      },
    },
  },
});
