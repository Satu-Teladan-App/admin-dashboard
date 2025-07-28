"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function KomunitasStats() {
  const [stats, setStats] = useState({
    totalKomunitas: 0,
    verified: 0,
    pending: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total komunitas count
      const { count: totalCount } = await supabase
        .from("komunitas")
        .select("*", { count: "exact", head: true });

      // Get verified komunitas count
      const { count: verifiedCount } = await supabase
        .from("komunitas_verification")
        .select("*", { count: "exact", head: true });

      // Calculate pending
      const pending = (totalCount || 0) - (verifiedCount || 0);

      // Get total members (from komunitas_admin table)
      const { count: totalMembers } = await supabase
        .from("komunitas_admin")
        .select("*", { count: "exact", head: true });

      setStats({
        totalKomunitas: totalCount || 0,
        verified: verifiedCount || 0,
        pending,
        totalMembers: totalMembers || 0,
      });
    } catch (error) {
      console.error("Error fetching komunitas stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Total Komunitas",
      value: loading ? "..." : stats.totalKomunitas.toLocaleString(),
      change: "+12.5%",
      trend: "up",
    },
    {
      title: "Verified",
      value: loading ? "..." : stats.verified.toLocaleString(),
      change: "+8.2%",
      trend: "up",
    },
    {
      title: "Pending",
      value: loading ? "..." : stats.pending.toLocaleString(),
      change: "-5.3%",
      trend: "down",
    },
    {
      title: "Total Members",
      value: loading ? "..." : stats.totalMembers.toLocaleString(),
      change: "+15.7%",
      trend: "up",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index} className="bg-purple-50 border-purple-100">
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
