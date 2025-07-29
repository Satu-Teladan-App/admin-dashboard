import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { KegiatanStats } from "@/src/modules/kegiatan/KegiatanStats";
import { KegiatanTable } from "@/src/modules/kegiatan/KegiatanTable";
import HeaderPage from "@/src/layout/Header";

export default function KegiatanPage() {
  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend="Kegiatan" link="kegiatan" />
      </HeaderPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Kegiatan Management
          </h1>
          <p className="text-gray-600">
            Kelola kegiatan dan acara komunitas alumni
          </p>
        </div>
        {/* <KegiatanStats /> */}
        <KegiatanTable />
      </div>
    </DefaultLayout>
  );
}
