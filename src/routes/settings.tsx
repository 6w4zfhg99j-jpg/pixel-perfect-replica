import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/settings")({
  head: () =>
    pageHead("Settings & backups", "Keep control of VONA preferences, exports and local backups."),
  component: SettingsPage,
});
