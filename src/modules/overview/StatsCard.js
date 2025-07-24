import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const stats = [
  {
    title: "Views",
    value: "7,265",
    change: "+11.01%",
    trend: "up",
  },
  {
    title: "Visits",
    value: "3,671",
    change: "-0.03%",
    trend: "down",
  },
  {
    title: "New Users",
    value: "156",
    change: "+15.03%",
    trend: "up",
  },
  {
    title: "Active Users",
    value: "2,318",
    change: "+6.08%",
    trend: "up",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-blue-50 border-blue-100">
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
