import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/settings")({
  head: () =>
    pageHead("Impostazioni e backup", "Gestisci preferenze, esportazioni e backup locali di VONA."),
  component: SettingsPage,
});
