import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const stats = [
  {
    title: "Pesan Masuk",
    value: "1,847",
    change: "+12.5%",
    trend: "up",
  },
  {
    title: "Belum Dibaca",
    value: "234",
    change: "+8.3%",
    trend: "up",
  },
  {
    title: "Sudah Dibalas",
    value: "1,456",
    change: "+15.7%",
    trend: "up",
  },
  {
    title: "Perlu Tindak Lanjut",
    value: "157",
    change: "-3.2%",
    trend: "down",
  },
];

export function PesanStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-indigo-50 border-indigo-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{stat.change}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
