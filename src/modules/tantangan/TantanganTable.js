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
import { Label } from "@/components/ui/label";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Target,
  Calendar,
  Trash2,
  RefreshCw,
  Zap,
  Trophy,
  Activity,
  Play,
  Pause,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function TantanganTable() {
  const [tantanganData, setTantanganData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTantangan, setSelectedTantangan] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    fetchTantangan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTantangan = async () => {
    try {
      setLoading(true);

      // Fetch all tantangan with kegiatan relationship
      const { data: tantanganData, error: tantanganError } = await supabase
        .from("tantangan")
        .select(
          `
          *,
          kegiatan (
            id,
            name,
            kegiatan_date,
            kegiatan_time,
            address,
            creator
          )
        `
        )
        .order("created_at", { ascending: false });

      if (tantanganError) throw tantanganError;

      // Fetch contributions count for each tantangan
      const { data: contributionsData, error: contributionsError } =
        await supabase
          .from("contribution")
          .select("tantangan_id, id")
          .not("tantangan_id", "is", null);

      if (contributionsError) {
        console.warn("Error fetching contributions:", contributionsError);
      }

      // Create a map of tantangan ID to contribution count
      const contributionCountMap = new Map();
      (contributionsData || []).forEach((contribution) => {
        const count = contributionCountMap.get(contribution.tantangan_id) || 0;
        contributionCountMap.set(contribution.tantangan_id, count + 1);
      });

      const enrichedData = (tantanganData || []).map((tantangan) => {
        const now = new Date();
        const startDate = tantangan.start_date
          ? new Date(tantangan.start_date)
          : null;
        const endDate = tantangan.end_date
          ? new Date(tantangan.end_date)
          : null;

        let status = "inactive";
        if (tantangan.is_active) {
          if (startDate && endDate) {
            if (now < startDate) {
              status = "upcoming";
            } else if (now > endDate) {
              status = "ended";
            } else {
              status = "active";
            }
          } else {
            status = "active";
          }
        }

        return {
          ...tantangan,
          contributionCount: contributionCountMap.get(tantangan.id) || 0,
          status,
        };
      });

      setTantanganData(enrichedData);
    } catch (error) {
      console.error("Error fetching tantangan:", error);
      toast.error("Failed to fetch tantangan data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (tantanganId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("tantangan")
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tantanganId);

      if (error) throw error;
      toast.success(
        `Tantangan ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
      fetchTantangan();
    } catch (error) {
      console.error("Error toggling tantangan:", error);
      toast.error("Failed to update tantangan status");
    }
  };

  const handleDeleteTantangan = async (tantanganId) => {
    if (
      !confirm(
        "Are you sure you want to delete this tantangan? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("tantangan")
        .delete()
        .eq("id", tantanganId);

      if (error) throw error;
      toast.success("Tantangan deleted successfully");
      fetchTantangan();
    } catch (error) {
      console.error("Error deleting tantangan:", error);
      toast.error("Failed to delete tantangan");
    }
  };

  const getStatusBadge = (tantangan) => {
    switch (tantangan.status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Play className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "upcoming":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Upcoming
          </Badge>
        );
      case "ended":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <XCircle className="w-3 h-3 mr-1" />
            Ended
          </Badge>
        );
      case "inactive":
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Pause className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
    }
  };

  const getTypeBadge = (type) => {
    const typeColors = {
      daily: "bg-purple-100 text-purple-800",
      weekly: "bg-indigo-100 text-indigo-800",
      monthly: "bg-pink-100 text-pink-800",
      event: "bg-orange-100 text-orange-800",
    };

    return (
      <Badge
        className={`${
          typeColors[type] || "bg-gray-100 text-gray-800"
        } hover:opacity-90`}
      >
        {type?.charAt(0).toUpperCase() + type?.slice(1) || "Unknown"}
      </Badge>
    );
  };

  const getStats = () => {
    const total = tantanganData.length;
    const active = tantanganData.filter((t) => t.status === "active").length;
    const upcoming = tantanganData.filter(
      (t) => t.status === "upcoming"
    ).length;
    const totalContributions = tantanganData.reduce(
      (sum, t) => sum + t.contributionCount,
      0
    );

    return { total, active, upcoming, totalContributions };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredData = tantanganData.filter((tantangan) => {
    const matchesSearch =
      tantangan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tantangan.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tantangan.type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || tantangan.status === filterStatus;

    const matchesType = filterType === "all" || tantangan.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique types for filter
  const uniqueTypes = [
    ...new Set(tantanganData.map((t) => t.type).filter(Boolean)),
  ];

  const stats = getStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading tantangan data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mr-auto w-11/12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Tantangan
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.active}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.upcoming}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Contributions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalContributions}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tantangan Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tantangan Management</CardTitle>
            <Button onClick={fetchTantangan} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search tantangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type?.charAt(0).toUpperCase() + type?.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all" || filterType !== "all"
                  ? "No tantangan found matching your criteria"
                  : "No tantangan data available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center text-lg">
                    Tantangan
                  </TableHead>
                  <TableHead className="text-center text-lg">Type</TableHead>
                  <TableHead className="text-center text-lg">
                    Duration
                  </TableHead>
                  <TableHead className="text-center text-lg">
                    Unit Limit
                  </TableHead>
                  <TableHead className="text-center text-lg">
                    Contributions
                  </TableHead>
                  <TableHead className="text-center text-lg">Status</TableHead>
                  <TableHead className="text-center text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((tantangan) => (
                  <TableRow key={tantangan.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium">{tantangan.name}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {tantangan.description || "No description"}
                          </div>
                          {tantangan.kegiatan && (
                            <div className="text-xs text-blue-600">
                              Linked to: {tantangan.kegiatan.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTypeBadge(tantangan.type)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div>{formatDate(tantangan.start_date)}</div>
                        <div className="text-gray-500">to</div>
                        <div>{formatDate(tantangan.end_date)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {tantangan.unit_limit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">
                          {tantangan.contributionCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(tantangan)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTantangan(tantangan)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Tantangan Details</DialogTitle>
                            </DialogHeader>
                            {selectedTantangan && (
                              <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Target className="w-8 h-8 text-purple-600" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold">
                                      {selectedTantangan.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      {getTypeBadge(selectedTantangan.type)}
                                      {getStatusBadge(selectedTantangan)}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Description
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {selectedTantangan.description ||
                                        "No description"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Unit Limit
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {selectedTantangan.unit_limit}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Start Date
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {formatDateTime(
                                        selectedTantangan.start_date
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      End Date
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {formatDateTime(
                                        selectedTantangan.end_date
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Contributions
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {selectedTantangan.contributionCount}{" "}
                                      contributions
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Created At
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {formatDateTime(
                                        selectedTantangan.created_at
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {selectedTantangan.kegiatan && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Linked Kegiatan
                                    </Label>
                                    <div className="mt-1 p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm font-medium text-blue-800">
                                        {selectedTantangan.kegiatan.name}
                                      </p>
                                      <p className="text-xs text-blue-600 mt-1">
                                        {selectedTantangan.kegiatan
                                          .kegiatan_date &&
                                          `Date: ${formatDate(
                                            selectedTantangan.kegiatan
                                              .kegiatan_date
                                          )}`}
                                        {selectedTantangan.kegiatan
                                          .kegiatan_time &&
                                          ` at ${selectedTantangan.kegiatan.kegiatan_time}`}
                                      </p>
                                      {selectedTantangan.kegiatan.address && (
                                        <p className="text-xs text-blue-600">
                                          Location:{" "}
                                          {selectedTantangan.kegiatan.address}
                                        </p>
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
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleActive(
                                  tantangan.id,
                                  tantangan.is_active
                                )
                              }
                            >
                              {tantangan.is_active ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                handleDeleteTantangan(tantangan.id)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Tantangan
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
    </div>
  );
}
