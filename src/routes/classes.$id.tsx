import { createFileRoute } from "@tanstack/react-router";
import { ClassPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/classes/$id")({
  head: () =>
    pageHead("Class attendance", "Manage VONA class bookings, payments and membership attendance."),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <ClassPage id={id} />;
}
