import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/calendar")({
  head: () => pageHead("Calendario", "Programma lezioni di yoga e stretching con VONA."),
  component: CalendarPage,
});
