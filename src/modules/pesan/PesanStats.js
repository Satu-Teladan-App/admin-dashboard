"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Mail,
  Reply,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function PesanStats() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    todayMessages: 0,
    recentMessages: 0,
    reportedMessages: 0,
    loading: true,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total messages
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      // Get today's messages
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Get recent messages (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: recentMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Get reported messages
      const { count: reportedMessages } = await supabase
        .from("messages_report")
        .select("*", { count: "exact", head: true });

      setStats({
        totalMessages: totalMessages || 0,
        todayMessages: todayMessages || 0,
        recentMessages: recentMessages || 0,
        reportedMessages: reportedMessages || 0,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching message stats:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

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
      title: "Reported Messages",
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
