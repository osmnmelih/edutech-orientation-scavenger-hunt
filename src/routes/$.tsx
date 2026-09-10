import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import GameApp from "@/GameApp.jsx";

// Catch-all client route: every non-/api path renders the SPA so React Router
// inside GameApp can dispatch /admin, /student, /admin/session/:id, etc.
export const Route = createFileRoute("/$")({
  ssr: false,
  component: () => (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
      <GameApp />
    </ClientOnly>
  ),
});
