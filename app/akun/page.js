import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { DataTable } from "@/src/modules/akun/DataTable";

import data from "./data";

export default function AkunPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Akun" link="akun" />
      <DataTable data={data} />
    </DefaultLayout>
  );
}
