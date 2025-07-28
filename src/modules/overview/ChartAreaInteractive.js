"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { createClient } from "@/utils/supabase/client";

const chartConfig = {
  alumni: {
    label: "Alumni",
    color: "hsl(var(--chart-1))",
  },
  kegiatan: {
    label: "Kegiatan",
    color: "hsl(var(--chart-2))",
  },
  donasi: {
    label: "Donasi",
    color: "hsl(var(--chart-3))",
  },
  berita: {
    label: "Berita",
    color: "hsl(var(--chart-4))",
  },
};

export function ChartAreaInteractive() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState("alumni");
  const supabase = createClient();

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      // Get data for the last 6 months
      const months = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthName = date.toLocaleDateString("id-ID", { month: "short" });

        // Fetch counts for each category for this month
        const [alumniCount, kegiatanCount, donasiCount, beritaCount] = await Promise.all([
          supabase
            .from("alumni")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date.toISOString())
            .lt("created_at", nextMonth.toISOString()),

          supabase
            .from("kegiatan")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date.toISOString())
            .lt("created_at", nextMonth.toISOString()),

          supabase
            .from("donasi")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date.toISOString())
            .lt("created_at", nextMonth.toISOString()),

          supabase
            .from("berita")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date.toISOString())
            .lt("created_at", nextMonth.toISOString()),
        ]);

        months.push({
          date: monthName,
          alumni: alumniCount.count || 0,
          kegiatan: kegiatanCount.count || 0,
          donasi: donasiCount.count || 0,
          berita: beritaCount.count || 0,
        });
      }

      setChartData(months);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const total = React.useMemo(
    () => ({
      alumni: chartData.reduce((acc, curr) => acc + curr.alumni, 0),
      kegiatan: chartData.reduce((acc, curr) => acc + curr.kegiatan, 0),
      donasi: chartData.reduce((acc, curr) => acc + curr.donasi, 0),
      berita: chartData.reduce((acc, curr) => acc + curr.berita, 0),
    }),
    [chartData]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>
            Showing activity trends for the last 6 months
          </CardDescription>
        </div>
        <div className="flex">
          {["alumni", "kegiatan", "donasi", "berita"].map((key) => {
            const chart = key;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {total[key].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient
                id={`fill${activeChart}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={`var(--color-${activeChart})`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${activeChart})`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey={activeChart}
              type="natural"
              fill={`url(#fill${activeChart})`}
              fillOpacity={0.4}
              stroke={`var(--color-${activeChart})`}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Activity trends over time{" "}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Last 6 months data from your database
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
