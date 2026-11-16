import DefaultLayout from "@/src/layout/DefaultLayout";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import AdminTickets from "@/src/modules/tickets/AdminTickets";
import HeaderPage from "@/src/layout/Header";

export default function Page() {
  return (
    <DefaultLayout>
      <HeaderPage>
            <BreadcrumbLine legend={"Chat Admin"} link={"tickets"} />
      </HeaderPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Chat Admin
          </h1>
          <p className="text-gray-600">
            Baca dan balas percakapan bantuan dari aplikasi Satu Teladan.
          </p>
        </div>
        <AdminTickets />
      </div>
    </DefaultLayout>
  );
}
