import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Presentation = lazy(() => import("../pages/Presentation.jsx"));

export const Route = createFileRoute("/presentation")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EduTech Orientation Scavenger Hunt — Overview" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
        <Presentation />
      </Suspense>
    </ClientOnly>
  ),
});
