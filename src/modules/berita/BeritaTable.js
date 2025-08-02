"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  MoreVertical,
  Calendar,
  AlertTriangle,
  Ban,
  Trash2,
  RefreshCw,
  ExternalLink,
  ImageIcon,
  Edit,
  Plus,
  Newspaper,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function BeritaTable() {
  const [beritaData, setBeritaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBerita, setSelectedBerita] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [userToBlacklist, setUserToBlacklist] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: "",
    category: "",
    link: "",
    description: "",
    image_url: "",
    publication_date: "",
  });
  const supabase = createClient();

  useEffect(() => {
    fetchBerita();
  }, []);

  const fetchBerita = async () => {
    try {
      setLoading(true);

      // First, fetch all berita with reports and mentions
      const { data: beritaData, error: beritaError } = await supabase
        .from("berita")
        .select(
          `
          *,
          berita_report(id, alasan, created_at, reporter_id),
          berita_mentions(alumni_id)
        `
        )
        .order("created_at", { ascending: false });

      if (beritaError) throw beritaError;

      // Get unique writer IDs
      const writerIds = new Set();
      beritaData?.forEach((berita) => {
        if (berita.writer) writerIds.add(berita.writer);
      });

      // Fetch alumni information for all writers
      let alumniData = [];
      if (writerIds.size > 0) {
        const { data: alumniDataResult, error: alumniError } = await supabase
          .from("alumni")
          .select(
            "id, user_id, name, full_name, telephone, avatar, batch, graduation_year"
          )
          .in("user_id", Array.from(writerIds));

        if (alumniError) {
          console.warn("Error fetching alumni:", alumniError);
          // Continue without alumni data if alumni table fetch fails
        } else {
          alumniData = alumniDataResult || [];
        }
      }

      // Create a map of user ID to alumni info for quick lookup
      const alumniMap = new Map();
      alumniData.forEach((alumni) => {
        alumniMap.set(alumni.user_id, alumni);
      });

      const enrichedData = (beritaData || []).map((berita) => ({
        ...berita,
        writerInfo: alumniMap.get(berita.writer) || {
          user_id: berita.writer,
          name: "Unknown Writer",
          full_name: "Unknown Writer",
        },
        hasReports: (berita.berita_report || []).length > 0,
        reportCount: (berita.berita_report || []).length,
        mentionCount: (berita.berita_mentions || []).length,
        reports: berita.berita_report || [],
        mentions: berita.berita_mentions || [],
        isPublished: !!berita.publication_date,
      }));

      setBeritaData(enrichedData);
    } catch (error) {
      console.error("Error fetching berita:", error);
      toast.error("Failed to fetch berita data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBerita = async (beritaId) => {
    if (!confirm("Are you sure you want to verify this berita?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("berita")
        .update({ publication_date: new Date().toISOString() })
        .eq("id", beritaId);

      if (error) throw error;
      toast.success("Berita verified and published successfully");
      fetchBerita();
    } catch (error) {
      console.error("Error verifying berita:", error);
      toast.error("Failed to verify berita");
    }
  };

  const handleDeleteBerita = async (beritaId) => {
    if (
      !confirm(
        "Are you sure you want to delete this berita? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("berita")
        .delete()
        .eq("id", beritaId);

      if (error) throw error;
      toast.success("Berita deleted successfully");
      fetchBerita();
    } catch (error) {
      console.error("Error deleting berita:", error);
      toast.error("Failed to delete berita");
    }
  };

  const handleBlacklistUser = async () => {
    if (!userToBlacklist || !blacklistReason.trim()) {
      toast.error("Please provide a reason for blacklisting");
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_feature_blacklist").insert({
        user_id: userToBlacklist.user_id,
        feature: "berita",
        reason: blacklistReason,
        blacklisted_by: user?.user?.id,
        blacklisted_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("User has been blacklisted from berita features");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setUserToBlacklist(null);
      fetchBerita();
    } catch (error) {
      console.error("Error blacklisting user:", error);
      toast.error("Failed to blacklist user");
    }
  };

  const handleAddBerita = async () => {
    if (!newArticle.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("berita").insert({
        title: newArticle.title,
        category: newArticle.category || null,
        link: newArticle.link || null,
        description: newArticle.description || null,
        image_url: newArticle.image_url || null,
        publication_date: newArticle.publication_date || null,
        auth_uid: user?.user?.id,
      });

      if (error) throw error;

      toast.success("Berita added successfully");
      setNewArticle({
        title: "",
        category: "",
        link: "",
        description: "",
        image_url: "",
        publication_date: "",
      });
      setShowAddDialog(false);
      fetchBerita();
    } catch (error) {
      console.error("Error adding berita:", error);
      toast.error("Failed to add berita");
    }
  };

  const handleViewReports = (berita) => {
    if (berita.reports.length === 0) {
      toast.info("No reports found for this berita");
      return;
    }

    const reportCount = berita.reports.length;
    const reportReasons = berita.reports.map((r) => r.alasan).join(", ");
    alert(`This berita has ${reportCount} report(s):\n${reportReasons}`);
  };

  const getStatusBadge = (berita) => {
    if (berita.hasReports) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Reported ({berita.reportCount})
        </Badge>
      );
    }

    if (berita.isPublished) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Draft
        </Badge>
      );
    }
  };

  const getCategoryBadge = (category) => {
    const colors = {
      Komunitas: "bg-purple-100 text-purple-800",
      Donasi: "bg-orange-100 text-orange-800",
      Kegiatan: "bg-blue-100 text-blue-800",
      Teknologi: "bg-indigo-100 text-indigo-800",
      Edukasi: "bg-green-100 text-green-800",
      Laporan: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge
        className={`${colors[category] || "bg-gray-100 text-gray-800"} hover:${
          colors[category] || "bg-gray-100"
        }`}
      >
        {category || "Umum"}
      </Badge>
    );
  };

  const getStats = () => {
    const total = beritaData.length;
    const published = beritaData.filter((b) => b.isPublished).length;
    const draft = beritaData.filter((b) => !b.isPublished).length;
    const reported = beritaData.filter((b) => b.hasReports).length;

    return { total, published, draft, reported };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredData = beritaData.filter((berita) => {
    const matchesSearch =
      berita.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      berita.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      berita.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      berita.writerInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      berita.writerInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && berita.isPublished) ||
      (filterStatus === "draft" && !berita.isPublished) ||
      (filterStatus === "reported" && berita.hasReports);

    const matchesCategory =
      filterCategory === "all" || berita.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = getStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading berita data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Berita
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Newspaper className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.published}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.draft}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reported</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.reported}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Berita Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between text-lg">
            <CardTitle>Berita Management</CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={fetchBerita} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Berita
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search berita, writer, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Komunitas">Komunitas</SelectItem>
                  <SelectItem value="Donasi">Donasi</SelectItem>
                  <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                  <SelectItem value="Teknologi">Teknologi</SelectItem>
                  <SelectItem value="Edukasi">Edukasi</SelectItem>
                  <SelectItem value="Laporan">Laporan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ||
                filterStatus !== "all" ||
                filterCategory !== "all"
                  ? "No berita found matching your criteria"
                  : "No berita data available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead  className="w-150 text-center text-lg">Article</TableHead>
                  <TableHead  className="w-150 text-center text-lg">Writer</TableHead>
                  <TableHead  className="w-150 text-center text-lg">Category</TableHead>
                  <TableHead  className="w-150 text-center text-lg">Status</TableHead>
                  <TableHead  className="w-150 text-center text-lg">Date</TableHead>
                  <TableHead  className="w-150 text-center text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((berita) => (
                  <TableRow
                    key={berita.id}
                    className={
                      berita.hasReports ? "bg-red-50 border-red-100" : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {berita.image_url ? (
                            <img
                              src={berita.image_url}
                              alt={berita.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                            {berita.title}
                          </div>
                          {berita.link && (
                            <a
                              href={berita.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View article
                            </a>
                          )}
                          {berita.mentionCount > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              <Users className="w-3 h-3 inline mr-1" />
                              {berita.mentionCount} mentions
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {berita.writerInfo?.full_name ||
                              berita.writerInfo?.name ||
                              "Admin"}
                          </div>
                          <div className="text-xs text-gray-500 ">
                            {berita.writerInfo?.batch &&
                              `Batch ${berita.writerInfo.batch}`}
                            {berita.writerInfo?.graduation_year &&
                              ` • ${berita.writerInfo.graduation_year}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {berita.writerInfo?.user_id || "No ID"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getCategoryBadge(berita.category)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(berita)}</TableCell>
                    <TableCell className="text-sm text-gray-500 text-center">
                      {formatDate(berita.publication_date || berita.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBerita(berita)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Berita Details</DialogTitle>
                            </DialogHeader>
                            {selectedBerita && (
                              <div className="space-y-6">
                                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                  {selectedBerita.image_url ? (
                                    <img
                                      src={selectedBerita.image_url}
                                      alt={selectedBerita.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="w-16 h-16 text-gray-400" />
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Title
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedBerita.title}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Writer
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedBerita.writerInfo?.full_name ||
                                        selectedBerita.writerInfo?.name ||
                                        "Admin"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {selectedBerita.writerInfo?.batch &&
                                        `Batch ${selectedBerita.writerInfo.batch}`}
                                      {selectedBerita.writerInfo
                                        ?.graduation_year &&
                                        ` • ${selectedBerita.writerInfo.graduation_year}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ID:{" "}
                                      {selectedBerita.writerInfo?.user_id ||
                                        "No ID"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Category
                                    </Label>
                                    <div className="mt-1">
                                      {getCategoryBadge(
                                        selectedBerita.category
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Status
                                    </Label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedBerita)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Created
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {formatDate(selectedBerita.created_at)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Published
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {formatDate(
                                        selectedBerita.publication_date
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {selectedBerita.description && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Description
                                    </Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm text-gray-900">
                                        {selectedBerita.description}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {selectedBerita.link && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      External Link
                                    </Label>
                                    <div className="mt-1">
                                      <a
                                        href={selectedBerita.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        View original article
                                      </a>
                                    </div>
                                  </div>
                                )}

                                {selectedBerita.reports.length > 0 && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Reports
                                    </Label>
                                    <div className="mt-1 space-y-2">
                                      {selectedBerita.reports.map(
                                        (report, index) => (
                                          <div
                                            key={report.id}
                                            className="p-2 bg-red-50 rounded text-sm"
                                          >
                                            <p className="text-red-800">
                                              {report.alasan}
                                            </p>
                                            <p className="text-red-600 text-xs">
                                              Reported on{" "}
                                              {formatDate(report.created_at)}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {berita.hasReports && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleViewReports(berita)}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  View Reports ({berita.reportCount})
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {!berita.isPublished && (
                              <DropdownMenuItem
                                onClick={() => handleVerifyBerita(berita.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify & Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Berita
                            </DropdownMenuItem>
                            {berita.link && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={berita.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Original
                                </a>
                              </DropdownMenuItem>
                            )}
                            {berita.writerInfo && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToBlacklist(berita.writerInfo);
                                  setShowBlacklistDialog(true);
                                }}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Blacklist Writer
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteBerita(berita.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Berita
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Berita Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Berita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newArticle.title}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, title: e.target.value })
                }
                placeholder="Enter article title..."
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newArticle.description}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, description: e.target.value })
                }
                placeholder="Enter article description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newArticle.category}
                  onValueChange={(value) =>
                    setNewArticle({ ...newArticle, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Komunitas">Komunitas</SelectItem>
                    <SelectItem value="Donasi">Donasi</SelectItem>
                    <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                    <SelectItem value="Teknologi">Teknologi</SelectItem>
                    <SelectItem value="Edukasi">Edukasi</SelectItem>
                    <SelectItem value="Laporan">Laporan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="publication_date">Publication Date</Label>
                <Input
                  id="publication_date"
                  type="datetime-local"
                  value={newArticle.publication_date}
                  onChange={(e) =>
                    setNewArticle({
                      ...newArticle,
                      publication_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={newArticle.image_url}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, image_url: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="link">External Link</Label>
              <Input
                id="link"
                value={newArticle.link}
                onChange={(e) =>
                  setNewArticle({ ...newArticle, link: e.target.value })
                }
                placeholder="https://example.com/article"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewArticle({
                    title: "",
                    category: "",
                    link: "",
                    description: "",
                    image_url: "",
                    publication_date: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBerita}
                disabled={!newArticle.title.trim()}
              >
                Add Berita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blacklist User Dialog */}
      <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User from Berita Features</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                User to Blacklist
              </Label>
              <p className="text-sm text-gray-900">
                {userToBlacklist?.full_name ||
                  userToBlacklist?.name ||
                  "Unknown User"}
              </p>
              <p className="text-xs text-gray-500">
                {userToBlacklist?.batch && `Batch ${userToBlacklist.batch}`}
                {userToBlacklist?.graduation_year &&
                  ` • ${userToBlacklist.graduation_year}`}
              </p>
              <p className="text-xs text-gray-500">
                ID: {userToBlacklist?.user_id || "No ID"}
              </p>
            </div>
            <div>
              <Label
                htmlFor="blacklist-reason"
                className="text-sm font-medium text-gray-700"
              >
                Reason for Blacklisting *
              </Label>
              <Textarea
                id="blacklist-reason"
                placeholder="Enter the reason for blacklisting this user from berita features..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBlacklistDialog(false);
                  setBlacklistReason("");
                  setUserToBlacklist(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBlacklistUser}
                className="bg-red-600 hover:bg-red-700"
                disabled={!blacklistReason.trim()}
              >
                <Ban className="w-4 h-4 mr-2" />
                Blacklist User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
