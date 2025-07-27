import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { KomunitasStats } from "@/src/modules/komunitas/KomunitasStats";
import { KomunitasTable } from "@/src/modules/komunitas/KomunitasTable";

export default function Page() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend={"Komunitas"} link={"komunitas"} />
      <h1>Halaman Komunitas</h1>
      <p>Ini adalah halaman untuk komunitas.</p>
      <KomunitasStats />
      <KomunitasTable />
    </DefaultLayout>
  );
}
