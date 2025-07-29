"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function PendanaanStats() {
  const [stats, setStats] = useState({
    totalDonasi: 0,
    totalTarget: 0,
    totalProgress: 0,
    verified: 0,
    reported: 0,
    thisMonth: 0,
    loading: true,
  });

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

      // Get this month's donasi count
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const { count: thisMonthCount } = await supabase
        .from("donasi")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonth.toISOString());

      // Get verified donasi count
      const { count: verifiedCount } = await supabase
        .from("donasi_verification")
        .select("*", { count: "exact", head: true });

      // Get reported donasi count
      const { count: reportedCount } = await supabase
        .from("donasi_report")
        .select("donasi_id", { count: "exact", head: true });

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
        reported: reportedCount || 0,
        thisMonth: thisMonthCount || 0,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching pendanaan stats:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = () => {
    if (!stats.totalTarget || stats.totalTarget === 0) return 0;
    return Math.round((stats.totalProgress / stats.totalTarget) * 100);
  };

  const statsData = [
    {
      title: "Total Campaigns",
      value: stats.loading ? "..." : stats.totalDonasi.toLocaleString(),
      icon: Wallet,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      iconColor: "text-blue-600",
      loading: stats.loading,
    },
    {
      title: "This Month",
      value: stats.loading ? "..." : stats.thisMonth.toLocaleString(),
      icon: TrendingUp,
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
      iconColor: "text-green-600",
      loading: stats.loading,
    },
    {
      title: "Verified Campaigns",
      value: stats.loading ? "..." : stats.verified.toLocaleString(),
      icon: CheckCircle,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      iconColor: "text-emerald-600",
      loading: stats.loading,
    },
    {
      title: "Reported Campaigns",
      value: stats.loading ? "..." : stats.reported.toLocaleString(),
      icon: AlertTriangle,
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      iconColor: "text-red-600",
      loading: stats.loading,
    },
  ];

  const fundingStats = [
    {
      title: "Total Target",
      value: stats.loading ? "..." : formatCurrency(stats.totalTarget),
      subtitle: "All campaigns combined",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-100",
    },
    {
      title: "Total Raised",
      value: stats.loading ? "..." : formatCurrency(stats.totalProgress),
      subtitle: `${getProgressPercentage()}% of total target`,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Campaign Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <Card key={index} className={`${stat.bgColor} ${stat.borderColor}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funding Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fundingStats.map((stat, index) => (
          <Card key={index} className={`${stat.bgColor} ${stat.borderColor}`}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
