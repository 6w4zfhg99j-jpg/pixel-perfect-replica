import { createFileRoute } from "@tanstack/react-router";
import { FinancePage } from "@/components/studio-pages";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/finance")({
  head: () => pageHead("Finance", "Review actual VONA studio income, expenses and monthly profit."),
  component: FinancePage,
});
