"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function PendanaanStats() {
  const [stats, setStats] = useState({
    totalDonasi: 0,
    totalTarget: 0,
    totalProgress: 0,
    verified: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total donasi count
      const { count: totalCount } = await supabase
        .from("donasi")
        .select("*", { count: "exact", head: true });

      // Get verified donasi count
      const { count: verifiedCount } = await supabase
        .from("donasi_verification")
        .select("*", { count: "exact", head: true });

      // Get sum of target amounts and progress
      const { data: donasiData } = await supabase
        .from("donasi")
        .select("target_amount, progress");

      let totalTarget = 0;
      let totalProgress = 0;

      donasiData?.forEach((donasi) => {
        totalTarget += donasi.target_amount || 0;
        totalProgress += donasi.progress || 0;
      });

      setStats({
        totalDonasi: totalCount || 0,
        totalTarget,
        totalProgress,
        verified: verifiedCount || 0,
      });
    } catch (error) {
      console.error("Error fetching pendanaan stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statsData = [
    {
      title: "Total Donasi",
      value: loading ? "..." : stats.totalDonasi.toLocaleString(),
      change: "+12.5%",
      trend: "up",
    },
    {
      title: "Target Donasi",
      value: loading ? "..." : formatCurrency(stats.totalTarget),
      change: "+8.2%",
      trend: "up",
    },
    {
      title: "Dana Terkumpul",
      value: loading ? "..." : formatCurrency(stats.totalProgress),
      change: "+15.3%",
      trend: "up",
    },
    {
      title: "Terverifikasi",
      value: loading ? "..." : stats.verified.toLocaleString(),
      change: "+5.1%",
      trend: "up",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index} className="bg-orange-50 border-orange-100">
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
