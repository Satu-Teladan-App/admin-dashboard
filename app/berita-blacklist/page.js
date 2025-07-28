"use client";

import { useState, useEffect } from "react";
import { BreadcrumbLine } from "@/src/element/Breadcrumb";
import DefaultLayout from "@/src/layout/DefaultLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Shield, User, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export default function BeritaBlacklistPage() {
  const [blacklistData, setBlacklistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    try {
      const { data, error } = await supabase
        .from("berita_blacklist")
        .select(`
          *,
          alumniInfo:alumni(user_id, name, full_name, telephone),
          verificatorInfo:alumni!verificator(user_id, name, full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get alumni info for each blacklisted user
      const enrichedData = (data || []).map(item => ({
        ...item,
        alumniInfo: item.alumniInfo || null,
        verificatorInfo: item.verificatorInfo || null,
      }));
      setBlacklistData(enrichedData);
    } catch (error) {
      console.error("Error fetching blacklist:", error);
      toast.error("Failed to fetch blacklist data");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromBlacklist = async (id) => {
    if (!confirm("Are you sure you want to remove this user from blacklist?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("berita_blacklist")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("User removed from blacklist successfully");
      fetchBlacklist();
    } catch (error) {
      console.error("Error removing from blacklist:", error);
      toast.error("Failed to remove from blacklist");
    }
  };

  const filteredData = blacklistData.filter(
    (item) =>
      item.alumniInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alumniInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.alumniInfo?.telephone
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBlacklistStats = () => {
    const total = blacklistData.length;
    const thisMonth = blacklistData.filter((item) => {
      const created = new Date(item.created_at);
      const now = new Date();
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;

    return { total, thisMonth };
  };

  const stats = getBlacklistStats();

  if (loading) {
    return (
      <DefaultLayout>
        <BreadcrumbLine legend="Berita Blacklist" link="berita-blacklist" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <BreadcrumbLine legend="Berita Blacklist" link="berita-blacklist" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Berita Blacklist
          </h1>
          <p className="text-gray-600">
            Kelola daftar penulis yang diblokir dari mengirim berita
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Blacklisted
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bulan Ini</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.thisMonth}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Active Monitoring
                  </p>
                </div>
                <User className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Blacklist Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daftar Blacklist</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm
                    ? "Tidak ada pengguna yang ditemukan"
                    : "Belum ada pengguna yang diblacklist"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Tanggal Blacklist</TableHead>
                    <TableHead>Verificator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {item.alumniInfo?.name ||
                                item.alumniInfo?.full_name ||
                                "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-500">
                              User ID: {item.user_id?.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.alumniInfo?.telephone || "No phone"}
                      </TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.verificatorInfo?.name ||
                            item.verificatorInfo?.full_name ||
                            "System"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          <Shield className="w-3 h-3 mr-1" />
                          Blacklisted
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFromBlacklist(item.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
}
