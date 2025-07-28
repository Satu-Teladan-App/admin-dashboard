"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function BeritaStats() {
  const [stats, setStats] = useState({
    totalArtikel: 0,
    artikelDipublikasi: 0,
    menungguReview: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total articles
      const { count: totalCount } = await supabase
        .from("berita")
        .select("*", { count: "exact", head: true });

      // Get published articles (assuming articles with publication_date are published)
      const { count: publishedCount } = await supabase
        .from("berita")
        .select("*", { count: "exact", head: true })
        .not("publication_date", "is", null);

      // Get pending review articles (no publication_date)
      const { count: pendingCount } = await supabase
        .from("berita")
        .select("*", { count: "exact", head: true })
        .is("publication_date", null);

      setStats({
        totalArtikel: totalCount || 0,
        artikelDipublikasi: publishedCount || 0,
        menungguReview: pendingCount || 0,
        totalViews: Math.floor(Math.random() * 100000), // Mock data for views until we add a views field
      });
    } catch (error) {
      console.error("Error fetching berita stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Total Artikel",
      value: loading ? "..." : stats.totalArtikel.toLocaleString(),
      change: "+18.2%",
      trend: "up",
    },
    {
      title: "Artikel Dipublikasi",
      value: loading ? "..." : stats.artikelDipublikasi.toLocaleString(),
      change: "+22.5%",
      trend: "up",
    },
    {
      title: "Menunggu Review",
      value: loading ? "..." : stats.menungguReview.toLocaleString(),
      change: "+5.3%",
      trend: "up",
    },
    {
      title: "Total Views",
      value: loading ? "..." : `${(stats.totalViews / 1000).toFixed(1)}K`,
      change: "+15.7%",
      trend: "up",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
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
