import { createFileRoute } from "@tanstack/react-router";
import { MembershipsPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/memberships")({
  head: () => pageHead("Abbonamenti", "Tieni traccia degli abbonamenti VONA acquistati e delle lezioni disponibili."),
  component: MembershipsPage,
});
