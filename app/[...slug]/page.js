import DefaultLayout from "@/src/layout/DefaultLayout";
import { notFound } from "next/navigation";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { SlugStats } from "@/src/modules/slug/SlugStats";
import { SlugTable } from "@/src/modules/slug/SlugTable";

export default function DynamicPage({ params }) {
  const { slug } = params;
  const validSlugs = ["komunitas", "pendanaan", "kegiatan"];

  if (!validSlugs.includes(slug?.[0])) {
    notFound();
  }
  return (
    <DefaultLayout>
      <BreadcrumbLine
        legend={slug[0].charAt(0).toUpperCase() + slug[0].slice(1)}
        link={slug[0]}
      />
      <h1>Halaman {slug[0].charAt(0).toUpperCase() + slug[0].slice(1)}</h1>
      <p>Ini adalah halaman untuk {slug[0]}.</p>
      <SlugStats />
      <SlugTable />
    </DefaultLayout>
  );
}
