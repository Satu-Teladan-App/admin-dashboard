import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";

export default function OverviewPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Overview" link="overview" />
    </DefaultLayout>
  );
}
