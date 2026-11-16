"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Mail,
  Reply,
  AlertTriangle,
} from "lucide-react";
import { getMessageStats } from '@/src/lib/messageStats';
import { createClient } from "@/utils/supabase/client";

export function PesanStats() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    todayMessages: 0,
    recentMessages: 0,
    reportedMessages: 0,
    loading: true,
  });

  const [supabase] = useState(createClient);
  const [error, setError] = useState(false);
  const fetchStats = useCallback(() => getMessageStats(supabase).then(values => {
    setError(false);
    setStats({ ...values, loading: false });
  }).catch(() => {
    setError(true);
    setStats(prev => ({ ...prev, loading: false }));
  }), [supabase]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);
  if (error) return <div role="alert" className="p-4 border border-red-200 text-red-800">
    Statistik pesan belum dapat dimuat.
    <button onClick={() => { setStats(prev => ({ ...prev, loading: true })); void fetchStats(); }} className="ml-3 p-2 underline">Coba Lagi</button>
  </div>;

  const statsData = [
    {
      title: "Total Messages",
      value: stats.totalMessages.toLocaleString(),
      icon: MessageCircle,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      iconColor: "text-blue-600",
      loading: stats.loading,
    },
    {
      title: "Today's Messages",
      value: stats.todayMessages.toLocaleString(),
      icon: Mail,
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
      iconColor: "text-green-600",
      loading: stats.loading,
    },
    {
      title: "Last 7 Days",
      value: stats.recentMessages.toLocaleString(),
      icon: Reply,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
      iconColor: "text-purple-600",
      loading: stats.loading,
    },
    {
      title: "Laporan Pesan",
      value: stats.reportedMessages.toLocaleString(),
      icon: AlertTriangle,
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      iconColor: "text-red-600",
      loading: stats.loading,
    },
  ];

  return (
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
                  {stat.loading ? "..." : stat.value}
                </p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
