import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import { TicketsTable } from "@/src/modules/tickets/TicketsTable";
import HeaderPage from "@/src/layout/Header";

export default function Page() {
  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend={"Support Tickets"} link={"tickets"} />
      </HeaderPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Support Tickets
          </h1>
          <p className="text-gray-600">
            Kelola dan tanggapi tiket dukungan dari pengguna
          </p>
        </div>
        <TicketsTable />
      </div>
    </DefaultLayout>
  );
}
