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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, Shield, User, Calendar, Filter } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import HeaderPage from "@/src/layout/Header";

const FEATURE_TYPES = [
  { value: "all", label: "All Features" },
  { value: "berita", label: "Berita" },
  { value: "alumni", label: "Alumni" },
  { value: "kegiatan", label: "Kegiatan" },
  { value: "komunitas", label: "Komunitas" },
  { value: "donasi", label: "Pendanaan" },
  { value: "message", label: "Messages" },
];

const FEATURE_COLORS = {
  berita: "bg-blue-100 text-blue-800",
  alumni: "bg-green-100 text-green-800",
  kegiatan: "bg-purple-100 text-purple-800",
  komunitas: "bg-yellow-100 text-yellow-800",
  donasi: "bg-pink-100 text-pink-800",
  message: "bg-gray-100 text-gray-800",
};

export default function BlacklistPage() {
  const [blacklistData, setBlacklistData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    try {
      // First, get all blacklist records
      const { data: blacklistRecords, error: blacklistError } = await supabase
        .from("user_feature_blacklist")
        .select("*")
        .eq("is_active", true)
        .order("blacklisted_at", { ascending: false });

      if (blacklistError) throw blacklistError;

      if (!blacklistRecords || blacklistRecords.length === 0) {
        setBlacklistData([]);
        return;
      }

      // Get unique user IDs from blacklist records
      const userIds = new Set();
      const blacklistedByIds = new Set();

      blacklistRecords.forEach((record) => {
        if (record.user_id) userIds.add(record.user_id);
        if (record.blacklisted_by) blacklistedByIds.add(record.blacklisted_by);
      });

      // Fetch alumni data for blacklisted users
      let blacklistedUsersAlumni = [];
      if (userIds.size > 0) {
        const { data: alumniDataResult, error: alumniError } = await supabase
          .from("alumni")
          .select(
            "id, user_id, name, full_name, telephone, batch, graduation_year"
          )
          .in("user_id", Array.from(userIds));

        if (alumniError) {
          console.warn("Error fetching blacklisted users alumni:", alumniError);
        } else {
          blacklistedUsersAlumni = alumniDataResult || [];
        }
      }

      // Fetch alumni data for blacklisted_by users
      let blacklistedByAlumni = [];
      if (blacklistedByIds.size > 0) {
        const { data: blacklistedByDataResult, error: blacklistedByError } =
          await supabase
            .from("alumni")
            .select(
              "id, user_id, name, full_name, telephone, batch, graduation_year"
            )
            .in("user_id", Array.from(blacklistedByIds));

        if (blacklistedByError) {
          console.warn(
            "Error fetching blacklisted_by alumni:",
            blacklistedByError
          );
        } else {
          blacklistedByAlumni = blacklistedByDataResult || [];
        }
      }

      // Create lookup maps
      const alumniByUserId = new Map();
      const blacklistedByMap = new Map();

      blacklistedUsersAlumni.forEach((alumni) => {
        if (alumni.user_id) {
          alumniByUserId.set(alumni.user_id, alumni);
        }
      });

      blacklistedByAlumni.forEach((alumni) => {
        if (alumni.user_id) {
          blacklistedByMap.set(alumni.user_id, alumni);
        }
      });

      // Enrich blacklist data with alumni information
      const enrichedData = blacklistRecords.map((item) => ({
        ...item,
        alumniInfo: alumniByUserId.get(item.user_id) || {
          user_id: item.user_id,
          name: "Unknown User",
          full_name: "Unknown User",
        },
        blacklistedByInfo: blacklistedByMap.get(item.blacklisted_by) || {
          user_id: item.blacklisted_by,
          name: "System",
          full_name: "System",
        },
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
        .from("user_feature_blacklist")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("User removed from blacklist successfully");
      fetchBlacklist();
    } catch (error) {
      console.error("Error removing from blacklist:", error);
      toast.error("Failed to remove from blacklist");
    }
  };

  const filteredData = blacklistData.filter((item) => {
    const matchesSearch =
      item.alumniInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alumniInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.alumniInfo?.telephone
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFeature =
      selectedFeature === "all" || item.feature === selectedFeature;

    return matchesSearch && matchesFeature;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
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
      const created = new Date(item.blacklisted_at);
      const now = new Date();
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;

    const byFeature = FEATURE_TYPES.slice(1).map((feature) => ({
      feature: feature.value,
      label: feature.label,
      count: blacklistData.filter((item) => item.feature === feature.value)
        .length,
    }));

    return { total, thisMonth, byFeature };
  };

  const stats = getBlacklistStats();

  if (loading) {
    return (
      <DefaultLayout>
        <BreadcrumbLine legend="User Blacklist" link="blacklists" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <HeaderPage>
        <BreadcrumbLine legend="User Blacklist" link="blacklists" />
      </HeaderPage>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            User Blacklist Management
          </h1>
          <p className="text-gray-600">
            Kelola daftar pengguna yang diblokir dari berbagai fitur platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-sm font-medium text-gray-600">
                    Active Features
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.byFeature.filter((f) => f.count > 0).length}
                  </p>
                </div>
                <Filter className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Active Monitoring
                  </p>
                </div>
                <User className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Blacklist by Feature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.byFeature.map((feature) => (
                <div key={feature.feature} className="text-center">
                  <Badge className={`${FEATURE_COLORS[feature.feature]} mb-2`}>
                    {feature.label}
                  </Badge>
                  <p className="text-2xl font-bold text-gray-900">
                    {feature.count}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blacklist Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daftar Blacklist</CardTitle>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedFeature}
                  onValueChange={setSelectedFeature}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_TYPES.map((feature) => (
                      <SelectItem key={feature.value} value={feature.value}>
                        {feature.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cari nama, telepon, atau alasan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || selectedFeature !== "all"
                    ? "Tidak ada pengguna yang ditemukan dengan filter saat ini"
                    : "Belum ada pengguna yang diblacklist"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Tanggal Blacklist</TableHead>
                    <TableHead>Blacklisted By</TableHead>
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
                              {item.alumniInfo?.telephone || "No phone"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            FEATURE_COLORS[item.feature] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {FEATURE_TYPES.find((f) => f.value === item.feature)
                            ?.label || item.feature}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-xs truncate"
                          title={item.reason || "No reason provided"}
                        >
                          {item.reason || "No reason provided"}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(item.blacklisted_at)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.blacklistedByInfo?.name ||
                            item.blacklistedByInfo?.full_name ||
                            "System"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          <Shield className="w-3 h-3 mr-1" />
                          Active
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
