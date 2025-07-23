import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";

export default function BeritaPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Berita" link="berita" />
    </DefaultLayout>
  );
}
