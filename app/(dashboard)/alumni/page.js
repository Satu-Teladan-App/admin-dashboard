import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { AlumniDataTable } from "@/src/modules/alumni/AlumniTable";
import HeaderPage from "@/src/layout/Header";

export default function AlumniPage() {
  return (
    <DefaultLayout>
      <div className="w-full">
        <HeaderPage>
          <BreadcrumbLine legend="Alumni" link="alumni" />
        </HeaderPage>
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
      </div>
    </DefaultLayout>
  );
}
