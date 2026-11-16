"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Newspaper, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function StatsCards() {
  const [supabase] = useState(createClient);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const { data, error: queryError } = await supabase.rpc("get_admin_product_overview");
      if (queryError || !data) throw queryError || new Error("Missing stats");
      setStats(data);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  if (error) return <div role="alert" className="my-5 p-5 border border-red-200 rounded-lg text-red-800">
    Statistik belum dapat dimuat. Nilai nol belum dapat dipastikan.
    <button type="button" onClick={load} className="ml-3 p-2 underline">Coba lagi</button>
  </div>;
  if (loading || !stats) return <p className="my-5 p-5 text-gray-700" role="status">Memuat statistik...</p>;

  const cards = [
    { title: "Profil Alumni", value: Number(stats.alumni.total).toLocaleString("id-ID"), subtitle: `${stats.alumni.verified} terverifikasi`, icon: Users },
    { title: "Kegiatan", value: Number(stats.kegiatan.total).toLocaleString("id-ID"), subtitle: `${stats.kegiatan.upcoming} berlangsung hari ini atau mendatang`, icon: Calendar },
    { title: "Berita", value: Number(stats.berita.total).toLocaleString("id-ID"), subtitle: `${stats.berita.thisMonth} dibuat bulan ini (WIB)`, icon: Newspaper },
    { title: "Komunitas", value: Number(stats.komunitas.total).toLocaleString("id-ID"), subtitle: `${stats.komunitas.verified} terverifikasi`, icon: TrendingUp },
  ];
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
    {cards.map((card) => <Card key={card.title}>
      <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-gray-700">{card.title}</CardTitle><card.icon className="h-4 w-4 text-blue-800" /></CardHeader>
      <CardContent><div className="text-2xl font-bold text-gray-900 break-words">{card.value}</div><p className="text-xs text-gray-600 mt-1">{card.subtitle}</p></CardContent>
    </Card>)}
  </div>;
}
