import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/calendar")({
  head: () => pageHead("Calendar", "Schedule yoga and stretching classes with VONA."),
  component: CalendarPage,
});
