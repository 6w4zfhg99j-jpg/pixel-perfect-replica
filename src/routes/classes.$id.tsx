import { createFileRoute } from "@tanstack/react-router";
import { ClassPage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/classes/$id")({
  head: () =>
    pageHead("Presenze della lezione", "Gestisci prenotazioni, pagamenti e presenze delle lezioni VONA."),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <ClassPage id={id} />;
}
