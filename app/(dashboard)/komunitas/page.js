import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { KomunitasStats } from "@/src/modules/komunitas/KomunitasStats";
import { KomunitasTable } from "@/src/modules/komunitas/KomunitasTable";

export default function Page() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend={"Komunitas"} link={"komunitas"} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Komunitas Management
          </h1>
          <p className="text-gray-600">
            Kelola komunitas alumni dan verifikasi status keanggotaan
          </p>
        </div>
        {/* <KomunitasStats /> */}
        <KomunitasTable />
      </div>
    </DefaultLayout>
  );
}
