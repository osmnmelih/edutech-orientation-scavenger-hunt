import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Home = lazy(() => import("../pages/Home.jsx"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EduTech Orientation Scavenger Hunt" },
      { name: "description", content: "Saarland University MSc Educational Technology Campus Orientation Game" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
        <Home />
      </Suspense>
    </ClientOnly>
  ),
});
