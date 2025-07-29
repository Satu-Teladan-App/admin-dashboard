import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { AlumniDataTable } from "@/src/modules/alumni/AlumniTable";

export default function AlumniPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Alumni" link="alumni" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Alumni Management
          </h1>
          <p className="text-gray-600">
            Kelola data alumni dan verifikasi status keanggotaan
          </p>
        </div>
        <AlumniDataTable />
      </div>
    </DefaultLayout>
  );
}
