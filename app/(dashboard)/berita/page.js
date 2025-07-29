import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { BeritaStats } from "@/src/modules/berita/BeritaStats";
import { BeritaTable } from "@/src/modules/berita/BeritaTable";
import HeaderPage from "@/src/layout/Header";

export default function BeritaPage() {
  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend="Berita" link="berita" />
      </HeaderPage>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Berita</h1>
        <p className="text-gray-600">
          Kelola artikel berita dan publikasi konten hahahaha
        </p>
      </div>

      {/* <BeritaStats /> */}
      <BeritaTable />
    </DefaultLayout>
  );
}
