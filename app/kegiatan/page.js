import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { KegiatanStats } from "@/src/modules/kegiatan/KegiatanStats";
import { KegiatanTable } from "@/src/modules/kegiatan/KegiatanTable";

export default function Page() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend={"Kegiatan"} link={"kegiatan"} />
      <h1>Halaman Kegiatan</h1>
      <p>Ini adalah halaman untuk kegiatan.</p>
      <KegiatanStats />
      <KegiatanTable />
    </DefaultLayout>
  );
}
