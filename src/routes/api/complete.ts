import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/db.server";

// POST /api/complete — mark a checkpoint complete
export const Route = createFileRoute("/api/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            teamId?: number | string;
            teamName?: string;
            checkpointId?: number | string;
            timeTaken?: number;
            answer?: string;
            photo?: string;
          };

          if (!body.teamId && !body.teamName)
            return Response.json({ error: "teamId or teamName is required" }, { status: 400 });

          // 1. Resolve Team
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

          if (!team) {
            // Find active orientation session
            let { data: session } = await db.from("sessions").select("*").eq("join_code", "EDUTECH26").maybeSingle();
            if (!session) {
              const { data: firstSession } = await db.from("sessions").select("*").order("id", { ascending: false }).limit(1).maybeSingle();
              session = firstSession;
            }
            if (session) {
              const { data: newTeam } = await db
                .from("teams")
                .insert({
                  session_id: session.id,
                  name: body.teamName?.trim() || "STUDENT PLAYER",
                  current_checkpoint: 1,
                })
                .select()
                .single();
              team = newTeam;
            }
          }

          if (!team) return Response.json({ error: "Team not found" }, { status: 404 });

          // 2. Resolve Checkpoint
          let currentCp: any = null;
          const numCpId = Number(body.checkpointId);
          if (!isNaN(numCpId) && numCpId > 0) {
            const { data } = await db.from("checkpoints").select("*").eq("id", numCpId).maybeSingle();
            currentCp = data;
          }

          // Fallback: look up by order_num within session
          if (!currentCp && !isNaN(numCpId)) {
            const { data } = await db
              .from("checkpoints")
              .select("*")
              .eq("session_id", team.session_id)
              .eq("order_num", numCpId)
              .maybeSingle();
            currentCp = data;
          }

          // Fallback: first checkpoint of session
          if (!currentCp) {
            const { data } = await db
              .from("checkpoints")
              .select("*")
              .eq("session_id", team.session_id)
              .order("order_num", { ascending: true })
              .limit(1)
              .maybeSingle();
            currentCp = data;
          }

          if (!currentCp) return Response.json({ error: "Checkpoint not found" }, { status: 404 });

          // 3. Prepare Answer/Photo
          const answerContent = body.photo
            ? JSON.stringify({ photo: body.photo, note: body.answer || "Station Verified via AR Camera Photo" })
            : (body.answer || "");

          // 4. Save Task Completion
          const { data: existing } = await db.from("task_completions").select("*")
            .eq("team_id", team.id).eq("checkpoint_id", currentCp.id).maybeSingle();
          const hintsUsed = existing?.hints_used ?? 0;
          const score = Math.max(40, 100 - hintsUsed * 15);

          if (existing) {
            await db.from("task_completions").update({
              time_taken: body.timeTaken ?? 0,
              score,
              answer: answerContent,
              completed_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await db.from("task_completions").insert({
              team_id: team.id,
              checkpoint_id: currentCp.id,
              time_taken: body.timeTaken ?? 0,
              hints_used: 0,
              score,
              answer: answerContent,
            });
          }

          // 5. Update next checkpoint on team
          const { data: nextCp } = await db.from("checkpoints").select("*")
            .eq("session_id", team.session_id)
            .eq("order_num", currentCp.order_num + 1).maybeSingle();

          await db.from("teams").update({ current_checkpoint: nextCp?.id ?? -1 }).eq("id", team.id);

          return Response.json({
            success: true,
            score,
            hintsUsed,
            nextCheckpoint: nextCp ?? null,
            finished: !nextCp,
          });
        } catch (err: any) {
          console.error("POST /api/complete error:", err);
          return Response.json({ error: err?.message || "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
