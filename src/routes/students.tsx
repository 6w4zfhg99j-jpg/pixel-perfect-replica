import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/students")({
  head: () => pageHead("Allieve", "Gestisci la tua community VONA e le cronologie delle allieve."),
  component: StudentsPage,
});
