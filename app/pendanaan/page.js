import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { PendanaanStats } from "@/src/modules/pendanaan/PendanaanStats";
import { PendanaanTable } from "@/src/modules/pendanaan/PendanaanTable";

export default function PendanaanPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Pendanaan" link="pendanaan" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Pendanaan Management
          </h1>
          <p className="text-gray-600">
            Kelola donasi dan program pendanaan komunitas
          </p>
        </div>
        <PendanaanStats />
        <PendanaanTable />
      </div>
    </DefaultLayout>
  );
}
