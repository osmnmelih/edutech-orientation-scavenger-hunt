import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AdminDashboard = lazy(() => import("../pages/AdminDashboard.jsx"));

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EduTech Orientation Scavenger Hunt — Admin Dashboard" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0314" }} />}>
        <AdminDashboard />
      </Suspense>
    </ClientOnly>
  ),
});
