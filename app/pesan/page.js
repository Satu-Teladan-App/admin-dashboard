import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";

export default function PesanPage() {
  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Pesan" link="pesan" />
    </DefaultLayout>
  );
}
