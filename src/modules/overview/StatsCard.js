"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Wallet, Newspaper, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function StatsCards() {
  const [stats, setStats] = useState({
    alumni: { total: 0, verified: 0 },
    kegiatan: { total: 0, upcoming: 0 },
    donasi: { total: 0, totalAmount: 0 },
    berita: { total: 0, thisMonth: 0 },
    komunitas: { total: 0, verified: 0 },
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch alumni stats
      const { count: alumniTotal } = await supabase
        .from("alumni")
        .select("*", { count: "exact", head: true });

      const { count: alumniVerified } = await supabase
        .from("alumni_verification")
        .select("*", { count: "exact", head: true });

      // Fetch kegiatan stats
      const { count: kegiatanTotal } = await supabase
        .from("kegiatan")
        .select("*", { count: "exact", head: true });

      const { data: kegiatanData } = await supabase
        .from("kegiatan")
        .select("kegiatan_date");

      const today = new Date();
      const upcomingKegiatan = kegiatanData?.filter(
        (k) => k.kegiatan_date && new Date(k.kegiatan_date) >= today
      ).length;

      // Fetch donasi stats
      const { count: donasiTotal } = await supabase
        .from("donasi")
        .select("*", { count: "exact", head: true });

      const { data: donasiData } = await supabase
        .from("donasi")
        .select("target_amount");

      const totalDonasiAmount =
        donasiData?.reduce((sum, d) => sum + (d.target_amount || 0), 0) || 0;

      // Fetch berita stats
      const { count: beritaTotal } = await supabase
        .from("berita")
        .select("*", { count: "exact", head: true });

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: beritaThisMonth } = await supabase
        .from("berita")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonth.toISOString());

      // Fetch komunitas stats
      const { count: komunitasTotal } = await supabase
        .from("komunitas")
        .select("*", { count: "exact", head: true });

      const { count: komunitasVerified } = await supabase
        .from("komunitas_verification")
        .select("*", { count: "exact", head: true });

      setStats({
        alumni: { total: alumniTotal || 0, verified: alumniVerified || 0 },
        kegiatan: {
          total: kegiatanTotal || 0,
          upcoming: upcomingKegiatan || 0,
        },
        donasi: { total: donasiTotal || 0, totalAmount: totalDonasiAmount },
        berita: { total: beritaTotal || 0, thisMonth: beritaThisMonth || 0 },
        komunitas: {
          total: komunitasTotal || 0,
          verified: komunitasVerified || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching overview stats:", error);
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
      title: "Total Alumni",
      value: loading ? "..." : stats.alumni.total.toLocaleString(),
      subtitle: `${stats.alumni.verified} verified`,
      icon: Users,
      color: "bg-blue-50 border-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Kegiatan",
      value: loading ? "..." : stats.kegiatan.total.toLocaleString(),
      subtitle: `${stats.kegiatan.upcoming} upcoming`,
      icon: Calendar,
      color: "bg-green-50 border-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Total Donasi",
      value: loading ? "..." : formatCurrency(stats.donasi.totalAmount),
      subtitle: `${stats.donasi.total} campaigns`,
      icon: Wallet,
      color: "bg-orange-50 border-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Berita",
      value: loading ? "..." : stats.berita.total.toLocaleString(),
      subtitle: `${stats.berita.thisMonth} this month`,
      icon: Newspaper,
      color: "bg-purple-50 border-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Komunitas",
      value: loading ? "..." : stats.komunitas.total.toLocaleString(),
      subtitle: `${stats.komunitas.verified} verified`,
      icon: TrendingUp,
      color: "bg-pink-50 border-pink-100",
      iconColor: "text-pink-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index} className={stat.color}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
