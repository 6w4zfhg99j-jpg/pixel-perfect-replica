import { createFileRoute } from "@tanstack/react-router";
import { FinancePage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/finance")({
  head: () => pageHead("Finanze", "Controlla entrate, uscite e utile mensile del tuo studio VONA."),
  component: FinancePage,
});
