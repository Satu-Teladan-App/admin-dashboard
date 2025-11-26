import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { KontribusiTable } from "@/src/modules/kontribusi/KontribusiTable";
import HeaderPage from "@/src/layout/Header";

export default function Page() {
  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend={"Kontribusi"} link={"kontribusi"} />
      </HeaderPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Kontribusi Management
          </h1>
          <p className="text-gray-600">
            Kelola kontribusi alumni dari tantangan dan donasi
          </p>
        </div>
        <KontribusiTable />
      </div>
    </DefaultLayout>
  );
}
