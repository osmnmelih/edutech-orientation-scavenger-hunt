import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const StudentView = lazy(() => import("../pages/StudentView.jsx"));

export const Route = createFileRoute("/student")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EduTech Orientation Scavenger Hunt" },
      { name: "description", content: "Student Navigation View" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
        <StudentView />
      </Suspense>
    </ClientOnly>
  ),
});
