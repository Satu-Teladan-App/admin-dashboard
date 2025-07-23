import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { PaginationLine } from "@/src/modules/akun/Pagination";
import DefaultLayout from "@/src/layout/DefaultLayout";
import Table from "@/src/modules/akun/Table";

export default function AkunPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Akun" link="akun" />

      <Table />
      <PaginationLine />
    </DefaultLayout>
  );
}
