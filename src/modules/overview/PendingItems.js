import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, TrendingUp } from "lucide-react";

const pendingItems = [
  {
    title: "Pengajuan Akun Masuk",
    count: "2,318",
    change: "6 pengajuan menunggu",
    trend: "up",
  },
  {
    title: "Pesan Masuk",
    count: "2,318",
    change: "12 pengajuan menunggu",
    trend: "up",
  },
  {
    title: "Berita Masuk",
    count: "2,318",
    change: "12 pengajuan menunggu",
    trend: "up",
  },
  {
    title: "Pengajuan Komunitas Masuk",
    count: "2,318",
    change: "12 pengajuan menunggu",
    trend: "up",
  },
  {
    title: "Pengajuan Kegiatan Masuk",
    count: "2,318",
    change: "12 pengajuan menunggu",
    trend: "up",
  },
  {
    title: "Pengajuan Pendanaan Masuk",
    count: "2,318",
    change: "9 pengajuan menunggu",
    trend: "up",
  },
];

export function PendingItems() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pendingItems.map((item, index) => (
        <Card
          key={index}
          className="bg-blue-50 border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {item.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {item.count}
                </p>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>{item.change}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
