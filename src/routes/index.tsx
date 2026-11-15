import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead("Panoramica", "Una panoramica chiara di lezioni, allieve, abbonamenti e finanze di VONA."),
  component: Dashboard,
});
