import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { PendanaanStats } from "@/src/modules/pendanaan/PendanaanStats";
import { PendanaanTable } from "@/src/modules/pendanaan/PendanaanTable";

export default function Page() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend={"Pendanaan"} link={"pendanaan"} />
      <h1>Halaman Pendanaan</h1>
      <p>Ini adalah halaman untuk pendanaan.</p>
      <PendanaanStats />
      <PendanaanTable />
    </DefaultLayout>
  );
}
