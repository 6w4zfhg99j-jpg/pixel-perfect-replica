import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead("Dashboard", "A clear overview of VONA classes, students, memberships and finances."),
  component: Dashboard,
});
