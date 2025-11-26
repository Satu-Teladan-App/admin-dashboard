import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { TantanganTable } from "@/src/modules/tantangan/TantanganTable";
import HeaderPage from "@/src/layout/Header";

export default function Page() {
  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend={"Tantangan"} link={"tantangan"} />
      </HeaderPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Tantangan Management
          </h1>
          <p className="text-gray-600">
            Kelola tantangan dan challenge untuk alumni
          </p>
        </div>
        <TantanganTable />
      </div>
    </DefaultLayout>
  );
}
