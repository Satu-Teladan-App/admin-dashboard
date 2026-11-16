import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { PesanStats } from "@/src/modules/pesan/PesanStats";
import { PesanTable } from "@/src/modules/pesan/PesanTable";
import HeaderPage from "@/src/layout/Header";

export default function PesanPage() {
  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend="Pesan" link="pesan" />
      </HeaderPage>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Moderasi Pesan Antaralumni</h1>
        <p className="text-gray-600">
          Kelola pesan antaralumni dan laporannya. Percakapan bantuan ada di menu Chat Admin.
        </p>
      </div>

      <PesanStats />
      <PesanTable />
    </DefaultLayout>
  );
}
