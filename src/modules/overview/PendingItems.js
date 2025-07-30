"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  User,
  Users,
  Calendar,
  Wallet,
  Newspaper,
  Eye,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

export function PendingItems() {
  const [pendingItems, setPendingItems] = useState({
    alumni: [],
    komunitas: [],
    kegiatan: [],
    donasi: [],
    berita: [],
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      // Fetch unverified alumni
      const { data: pendingAlumni } = await supabase
        .from("alumni")
        .select(
          `
          id,
          name,
          full_name,
          created_at,
          alumni_verification (id)
        `
        )
        .is("alumni_verification.id", null)
        .limit(5);

      // Fetch unverified komunitas
      const { data: pendingKomunitas } = await supabase
        .from("komunitas")
        .select(
          `
          id,
          name,
          created_at,
          komunitas_verification (id)
        `
        )
        .is("komunitas_verification.id", null)
        .limit(5);

      // Fetch unverified kegiatan
      const { data: pendingKegiatan } = await supabase
        .from("kegiatan")
        .select(
          `
          id,
          name,
          created_at,
          kegiatan_verification (id)
        `
        )
        .is("kegiatan_verification.id", null)
        .limit(5);

      // Fetch unverified donasi
      const { data: pendingDonasi } = await supabase
        .from("donasi")
        .select(
          `
          id,
          event_name,
          created_at,
          donasi_verification (id)
        `
        )
        .is("donasi_verification.id", null)
        .limit(5);

      // Fetch recent berita (no verification table, so just show recent ones)
      const { data: recentBerita } = await supabase
        .from("berita")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      setPendingItems({
        alumni: pendingAlumni || [],
        komunitas: pendingKomunitas || [],
        kegiatan: pendingKegiatan || [],
        donasi: pendingDonasi || [],
        berita: recentBerita || [],
      });
    } catch (error) {
      console.error("Error fetching pending items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickVerify = async (type, id) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const tableName = `${type}_verification`;
      const columnName = `${type}_id`;

      const { error } = await supabase.from(tableName).insert({
        [columnName]: id,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully`
      );
      fetchPendingItems(); // Refresh the list
    } catch (error) {
      console.error("Error verifying item:", error);
      toast.error("Failed to verify item");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  const getPendingCount = () => {
    return (
      pendingItems.alumni.length +
      pendingItems.komunitas.length +
      pendingItems.kegiatan.length +
      pendingItems.donasi.length
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 ">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading pending items...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-520 mt-5">
      {/* Pending Verifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between  " >
            <CardTitle className="flex items-center gap-2 ">
              <Clock className="w-5 h-5 text-orange-600" />
              Pending Verifications
            </CardTitle>
            <Badge variant="outline" className="text-orange-600">
              {getPendingCount()} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alumni */}
          {pendingItems.alumni.map((alumni) => (
            <div
              key={alumni.id}
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">
                    {alumni.name || alumni.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Alumni • {formatDate(alumni.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickVerify("alumni", alumni.id)}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/alumni">
                    <Eye className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}

          {/* Komunitas */}
          {pendingItems.komunitas.map((komunitas) => (
            <div
              key={komunitas.id}
              className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-medium text-sm">{komunitas.name}</p>
                  <p className="text-xs text-gray-500">
                    Komunitas • {formatDate(komunitas.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickVerify("komunitas", komunitas.id)}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/komunitas">
                    <Eye className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}

          {/* Kegiatan */}
          {pendingItems.kegiatan.map((kegiatan) => (
            <div
              key={kegiatan.id}
              className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-green-600" />
                <div>
                  <p className="font-medium text-sm">{kegiatan.name}</p>
                  <p className="text-xs text-gray-500">
                    Kegiatan • {formatDate(kegiatan.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickVerify("kegiatan", kegiatan.id)}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/kegiatan">
                    <Eye className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}

          {/* Donasi */}
          {pendingItems.donasi.map((donasi) => (
            <div
              key={donasi.id}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="font-medium text-sm">{donasi.event_name}</p>
                  <p className="text-xs text-gray-500">
                    Donasi • {formatDate(donasi.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickVerify("donasi", donasi.id)}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/pendanaan">
                    <Eye className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}

          {getPendingCount() === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p>All items are verified!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingItems.berita.map((berita) => (
            <div
              key={berita.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Newspaper className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">{berita.title}</p>
                  <p className="text-xs text-gray-500">
                    Berita • {formatDate(berita.created_at)}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/berita">
                  <Eye className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          ))}

          {pendingItems.berita.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
