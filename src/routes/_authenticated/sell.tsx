import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { ListingForm } from "@/components/ListingForm";

export const Route = createFileRoute("/_authenticated/sell")({
  component: SellPage,
});

function SellPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar title={t("sellSomething")} />
      <ListingForm mode="create" />
    </div>
  );
}
