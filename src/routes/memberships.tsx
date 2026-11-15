import { createFileRoute } from "@tanstack/react-router";
import { MembershipsPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/memberships")({
  head: () => pageHead("Memberships", "Track VONA membership purchases and available visits."),
  component: MembershipsPage,
});
