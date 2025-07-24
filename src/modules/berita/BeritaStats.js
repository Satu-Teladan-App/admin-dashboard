import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const stats = [
  {
    title: "Total Artikel",
    value: "2,456",
    change: "+18.2%",
    trend: "up",
  },
  {
    title: "Artikel Dipublikasi",
    value: "1,987",
    change: "+22.5%",
    trend: "up",
  },
  {
    title: "Menunggu Review",
    value: "234",
    change: "+5.3%",
    trend: "up",
  },
  {
    title: "Total Views",
    value: "125.4K",
    change: "+15.7%",
    trend: "up",
  },
];

export function BeritaStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-emerald-50 border-emerald-100">
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
