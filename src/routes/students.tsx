import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/students")({
  head: () => pageHead("Students", "Manage your VONA community and student histories."),
  component: StudentsPage,
});
