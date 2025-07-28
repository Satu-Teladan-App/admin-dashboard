"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function KegiatanStats() {
  const [stats, setStats] = useState({
    totalKegiatan: 0,
    upcoming: 0,
    completed: 0,
    verified: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total kegiatan count
      const { count: totalCount } = await supabase
        .from("kegiatan")
        .select("*", { count: "exact", head: true });

      // Get verified kegiatan count
      const { count: verifiedCount } = await supabase
        .from("kegiatan_verification")
        .select("*", { count: "exact", head: true });

      // Get kegiatan data to calculate upcoming/completed
      const { data: kegiatanData } = await supabase
        .from("kegiatan")
        .select("kegiatan_date");

      let upcoming = 0;
      let completed = 0;
      const today = new Date();

      kegiatanData?.forEach((kegiatan) => {
        if (kegiatan.kegiatan_date) {
          const eventDate = new Date(kegiatan.kegiatan_date);
          if (eventDate >= today) {
            upcoming++;
          } else {
            completed++;
          }
        }
      });

      setStats({
        totalKegiatan: totalCount || 0,
        upcoming,
        completed,
        verified: verifiedCount || 0,
      });
    } catch (error) {
      console.error("Error fetching kegiatan stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Total Kegiatan",
      value: loading ? "..." : stats.totalKegiatan.toLocaleString(),
      change: "+8.2%",
      trend: "up",
    },
    {
      title: "Upcoming",
      value: loading ? "..." : stats.upcoming.toLocaleString(),
      change: "+12.5%",
      trend: "up",
    },
    {
      title: "Completed",
      value: loading ? "..." : stats.completed.toLocaleString(),
      change: "+5.3%",
      trend: "up",
    },
    {
      title: "Verified",
      value: loading ? "..." : stats.verified.toLocaleString(),
      change: "+15.7%",
      trend: "up",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index} className="bg-green-50 border-green-100">
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
