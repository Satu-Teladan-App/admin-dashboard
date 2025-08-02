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
  MapPin,
  AlertTriangle,
  Ban,
  Trash2,
  RefreshCw,
  Users,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KegiatanTable() {
  const [kegiatanData, setKegiatanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [userToBlacklist, setUserToBlacklist] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    fetchKegiatan();
  }, []);

  const fetchKegiatan = async () => {
    try {
      setLoading(true);

      // First, fetch all kegiatan with verification and attendance
      const { data: kegiatanData, error: kegiatanError } = await supabase
        .from("kegiatan")
        .select(
          `
          *,
          kegiatan_verification(id, created_at, verificator_id),
          kegiatan_attendance_list(id, alumni_id, created_at)
        `
        )
        .order("created_at", { ascending: false });

      if (kegiatanError) throw kegiatanError;

      // Fetch reports for kegiatan separately
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .not("kegiatan_id", "is", null);

      if (reportsError) {
        console.warn("Error fetching reports:", reportsError);
      }

      // Get unique creator IDs
      const creatorIds = new Set();
      kegiatanData?.forEach((kegiatan) => {
        if (kegiatan.creator) creatorIds.add(kegiatan.creator);
      });

      // Fetch alumni information for all creators
      let alumniData = [];
      if (creatorIds.size > 0) {
        const { data: alumniDataResult, error: alumniError } = await supabase
          .from("alumni")
          .select(
            "id, user_id, name, full_name, telephone, avatar, batch, graduation_year"
          )
          .in("user_id", Array.from(creatorIds));

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

      // Create a map of kegiatan ID to reports
      const reportsMap = new Map();
      (reportsData || []).forEach((report) => {
        if (!reportsMap.has(report.kegiatan_id)) {
          reportsMap.set(report.kegiatan_id, []);
        }
        reportsMap.get(report.kegiatan_id).push(report);
      });

      const enrichedData = (kegiatanData || []).map((kegiatan) => {
        const reports = reportsMap.get(kegiatan.id) || [];
        return {
          ...kegiatan,
          creatorInfo: alumniMap.get(kegiatan.creator) || {
            user_id: kegiatan.creator,
            name: "Unknown Creator",
            full_name: "Unknown Creator",
          },
          isVerified: (kegiatan.kegiatan_verification || []).length > 0,
          hasReports: reports.length > 0,
          reportCount: reports.length,
          attendeeCount: (kegiatan.kegiatan_attendance_list || []).length,
          reports: reports,
          attendees: kegiatan.kegiatan_attendance_list || [],
        };
      });

      setKegiatanData(enrichedData);
    } catch (error) {
      console.error("Error fetching kegiatan:", error);
      toast.error("Failed to fetch kegiatan data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceList = async (kegiatanId) => {
    try {
      const { data, error } = await supabase
        .from("kegiatan_attendance_list")
        .select(
          `
          *,
          attendeeInfo:alumni(id, name, full_name, telephone)
        `
        )
        .eq("kegiatan_id", kegiatanId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttendanceList(data || []);
      setShowAttendanceDialog(true);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance data");
    }
  };

  const handleVerifyKegiatan = async (kegiatanId) => {
    if (!confirm("Are you sure you want to verify this kegiatan?")) {
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("kegiatan_verification").insert({
        kegiatan_id: kegiatanId,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;
      toast.success("Kegiatan verified successfully");
      fetchKegiatan();
    } catch (error) {
      console.error("Error verifying kegiatan:", error);
      toast.error("Failed to verify kegiatan");
    }
  };

  const handleDeleteKegiatan = async (kegiatanId) => {
    if (
      !confirm(
        "Are you sure you want to delete this kegiatan? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("kegiatan")
        .delete()
        .eq("id", kegiatanId);

      if (error) throw error;
      toast.success("Kegiatan deleted successfully");
      fetchKegiatan();
    } catch (error) {
      console.error("Error deleting kegiatan:", error);
      toast.error("Failed to delete kegiatan");
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
        feature: "kegiatan",
        reason: blacklistReason,
        blacklisted_by: user?.user?.id,
        blacklisted_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("User has been blacklisted from kegiatan features");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setUserToBlacklist(null);
      fetchKegiatan();
    } catch (error) {
      console.error("Error blacklisting user:", error);
      toast.error("Failed to blacklist user");
    }
  };

  const handleViewReports = (kegiatan) => {
    if (kegiatan.reports.length === 0) {
      toast.info("No reports found for this kegiatan");
      return;
    }

    const reportCount = kegiatan.reports.length;
    const reportReasons = kegiatan.reports.map((r) => r.alasan).join(", ");
    alert(`This kegiatan has ${reportCount} report(s):\n${reportReasons}`);
  };

  const getStatusBadge = (kegiatan) => {
    if (kegiatan.hasReports) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Reported ({kegiatan.reportCount})
        </Badge>
      );
    }

    if (kegiatan.isVerified) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
  };

  const getEventStatusBadge = (kegiatanDate) => {
    if (!kegiatanDate) return null;

    const eventDate = new Date(kegiatanDate);
    const today = new Date();

    if (eventDate > today) {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Upcoming
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          Completed
        </Badge>
      );
    }
  };

  const getStats = () => {
    const total = kegiatanData.length;
    const verified = kegiatanData.filter((k) => k.isVerified).length;
    const reported = kegiatanData.filter((k) => k.hasReports).length;
    const upcoming = kegiatanData.filter(
      (k) => k.kegiatan_date && new Date(k.kegiatan_date) > new Date()
    ).length;

    return { total, verified, reported, upcoming };
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

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const time = timeString ? ` at ${timeString}` : "";
    return `${date}${time}`;
  };

  const filteredData = kegiatanData.filter((kegiatan) => {
    const matchesSearch =
      kegiatan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kegiatan.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kegiatan.creatorInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      kegiatan.creatorInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "verified" && kegiatan.isVerified) ||
      (filterStatus === "pending" && !kegiatan.isVerified) ||
      (filterStatus === "reported" && kegiatan.hasReports) ||
      (filterStatus === "upcoming" &&
        kegiatan.kegiatan_date &&
        new Date(kegiatan.kegiatan_date) > new Date());

    return matchesSearch && matchesFilter;
  });

  const stats = getStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading kegiatan data...</span>
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
                  Total Kegiatan
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.verified}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.upcoming}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
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

      {/* Kegiatan Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mr-auto w-11/12">
            <CardTitle>Kegiatan Management</CardTitle>
            <Button onClick={fetchKegiatan} variant="outline" size="sm">
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
                  placeholder="Search kegiatan, organizer, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter kegiatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all ">All Kegiatan</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8 ">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all"
                  ? "No kegiatan found matching your criteria"
                  : "No kegiatan data available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-150 text-center text-lg">
                    Event
                  </TableHead>
                  <TableHead className="w-150 text-center text-lg">
                    Organizer
                  </TableHead>
                  <TableHead className="w-150 text-center text-lg">
                    Date & Time
                  </TableHead>
                  <TableHead className="w-150 text-center text-lg">
                    Location
                  </TableHead>
                  <TableHead className="w-150 text-center text-lg">
                    Attendees
                  </TableHead>
                  <TableHead className="w-150 text-center text-lg">
                    Status
                  </TableHead>
                  <TableHead className="w-150 text-center text-lg">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((kegiatan) => (
                  <TableRow
                    key={kegiatan.id}
                    className={
                      kegiatan.hasReports ? "bg-red-50 border-red-100" : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{kegiatan.name}</div>
                          <div className="text-sm text-gray-500">
                            Created {formatDate(kegiatan.created_at)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 ">
                        <div className=" w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {kegiatan.creatorInfo?.full_name ||
                              kegiatan.creatorInfo?.name ||
                              "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500  ">
                            {kegiatan.creatorInfo?.batch &&
                              `Batch ${kegiatan.creatorInfo.batch}`}
                            {kegiatan.creatorInfo?.graduation_year &&
                              ` • ${kegiatan.creatorInfo.graduation_year}`}
                          </div>
                          <div className="text-xs text-gray-500 ">
                            ID: {kegiatan.creatorInfo?.user_id || "No ID"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-center  ">
                        {formatDateTime(
                          kegiatan.kegiatan_date,
                          kegiatan.kegiatan_time
                        )}
                      </div>
                    </TableCell>
                    <TableCell className=" justify-center">
                      <div className=" flex items-center gap-1 text-sm ">
                        <MapPin className="w-3 h-3 text-gray-400  " />
                        <span className="truncate max-w-xs ">
                          {kegiatan.address || "No address"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center ">
                        <span className="text-sm font-medium  ">
                          {kegiatan.attendeeCount}
                        </span>
                        {kegiatan.kuota && (
                          <span className="text-sm text-gray-500">
                            / {kegiatan.kuota}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="justify-center ">
                      <div className="space-y-1  text-center">
                        {getStatusBadge(kegiatan)}
                        {getEventStatusBadge(kegiatan.kegiatan_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center ">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedKegiatan(kegiatan)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl ">
                            <DialogHeader>
                              <DialogTitle>Kegiatan Details</DialogTitle>
                            </DialogHeader>
                            {selectedKegiatan && (
                              <div className="space-y-6 ">
                                <div className="grid grid-cols-2 gap-4 ">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Event Name
                                    </Label>
                                    <p className="text-sm text-gray-900 ">
                                      {selectedKegiatan.name}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Organizer
                                    </Label>
                                    <p className="text-sm text-gray-900 ">
                                      {selectedKegiatan.creatorInfo
                                        ?.full_name ||
                                        selectedKegiatan.creatorInfo?.name ||
                                        "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500 ">
                                      {selectedKegiatan.creatorInfo?.batch &&
                                        `Batch ${selectedKegiatan.creatorInfo.batch}`}
                                      {selectedKegiatan.creatorInfo
                                        ?.graduation_year &&
                                        ` • ${selectedKegiatan.creatorInfo.graduation_year}`}
                                    </p>
                                    <p className="text-xs text-gray-500 ">
                                      ID:{" "}
                                      {selectedKegiatan.creatorInfo?.user_id ||
                                        "No ID"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Date
                                    </Label>
                                    <p className="text-sm text-gray-900 ">
                                      {formatDate(
                                        selectedKegiatan.kegiatan_date
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Time
                                    </Label>
                                    <p className="text-sm text-gray-900 ">
                                      {selectedKegiatan.kegiatan_time || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Attendees
                                    </Label>
                                    <p className="text-sm text-gray-900 text-center">
                                      {selectedKegiatan.attendeeCount}{" "}
                                      {selectedKegiatan.kuota &&
                                        `/ ${selectedKegiatan.kuota}`}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Status
                                    </Label>
                                    <div className="mt-1 space-y-1 ">
                                      {getStatusBadge(selectedKegiatan)}
                                      {getEventStatusBadge(
                                        selectedKegiatan.kegiatan_date
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium text-gray-700 ">
                                    Address
                                  </Label>
                                  <p className="text-sm text-gray-900 ">
                                    {selectedKegiatan.address ||
                                      "No address provided"}
                                  </p>
                                </div>

                                {selectedKegiatan.description && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Description
                                    </Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-lg ">
                                      <p className="text-sm text-gray-900 ">
                                        {selectedKegiatan.description}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {selectedKegiatan.pelaksana && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Pelaksana
                                    </Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                        {typeof selectedKegiatan.pelaksana ===
                                        "string"
                                          ? selectedKegiatan.pelaksana
                                          : JSON.stringify(
                                              selectedKegiatan.pelaksana,
                                              null,
                                              2
                                            )}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {selectedKegiatan.reports.length > 0 && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 ">
                                      Reports
                                    </Label>
                                    <div className="mt-1 space-y-2 ">
                                      {selectedKegiatan.reports.map(
                                        (report, index) => (
                                          <div
                                            key={report.id}
                                            className="p-2 bg-red-50 rounded text-sm "
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

                                <div className="flex justify-end gap-2 ">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      fetchAttendanceList(selectedKegiatan.id)
                                    }
                                  >
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    View Attendees (
                                    {selectedKegiatan.attendeeCount})
                                  </Button>
                                </div>
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
                            {kegiatan.hasReports && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleViewReports(kegiatan)}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  View Reports ({kegiatan.reportCount})
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {!kegiatan.isVerified && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleVerifyKegiatan(kegiatan.id)
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Kegiatan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => fetchAttendanceList(kegiatan.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              View Attendees ({kegiatan.attendeeCount})
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToBlacklist(kegiatan.creatorInfo);
                                setShowBlacklistDialog(true);
                              }}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Blacklist Creator
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteKegiatan(kegiatan.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Kegiatan
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

      {/* Blacklist User Dialog */}
      <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User from Kegiatan Features</DialogTitle>
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
                placeholder="Enter the reason for blacklisting this user from kegiatan features..."
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

      {/* Attendance List Dialog */}
      <Dialog
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Attendees</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {attendanceList.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No attendees registered
              </p>
            ) : (
              <div className="space-y-2">
                {attendanceList.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium">
                        {attendance.attendeeInfo?.name ||
                          attendance.attendeeInfo?.full_name ||
                          "Unknown"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {attendance.attendeeInfo?.telephone || "No phone"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-100 text-blue-800">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Registered
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(attendance.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
