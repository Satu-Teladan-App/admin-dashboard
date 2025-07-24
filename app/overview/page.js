import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { StatsCards } from "@/src/modules/overview/StatsCard";
import { ChartAreaInteractive } from "@/src/modules/overview/ChartAreaInteractive";

export default function OverviewPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Overview" link="overview" />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-gray-600">Dashboard overview dan statistik sistem</p>
      </div>
      <StatsCards />
      <ChartAreaInteractive />
    </DefaultLayout>
  );
}
