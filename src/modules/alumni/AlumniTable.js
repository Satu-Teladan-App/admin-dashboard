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
  XCircle,
  Clock,
  MoreVertical,
  User,
  AlertTriangle,
  Ban,
  Trash2,
  RefreshCw,
  MapPin,
  Phone,
  Calendar,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function AlumniDataTable() {
  const [alumniData, setAlumniData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [userToBlacklist, setUserToBlacklist] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("alumni")
        .select(
          `
          *,
          alumni_verification (
            id,
            created_at,
            verificator_id
          ),
          alumni_report(id, alasan, created_at, reporter_id)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedData = (data || []).map((alumni) => ({
        ...alumni,
        isVerified: (alumni.alumni_verification || []).length > 0,
        hasReports: (alumni.alumni_report || []).length > 0,
        reportCount: (alumni.alumni_report || []).length,
        reports: alumni.alumni_report || [],
      }));

      setAlumniData(enrichedData);
    } catch (error) {
      console.error("Error fetching alumni:", error);
      toast.error("Failed to fetch alumni data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAlumni = async (alumniId) => {
    if (!confirm("Are you sure you want to verify this alumni?")) {
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("alumni_verification").insert({
        alumni_id: alumniId,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;
      toast.success("Alumni verified successfully");
      fetchAlumni();
    } catch (error) {
      console.error("Error verifying alumni:", error);
      toast.error("Failed to verify alumni");
    }
  };

  const handleDeleteAlumni = async (alumniId) => {
    if (
      !confirm(
        "Are you sure you want to delete this alumni profile? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("alumni")
        .delete()
        .eq("id", alumniId);

      if (error) throw error;
      toast.success("Alumni profile deleted successfully");
      fetchAlumni();
    } catch (error) {
      console.error("Error deleting alumni:", error);
      toast.error("Failed to delete alumni profile");
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
        feature: "alumni",
        reason: blacklistReason,
        blacklisted_by: user?.user?.id,
        blacklisted_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("User has been blacklisted from alumni features");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setUserToBlacklist(null);
      fetchAlumni();
    } catch (error) {
      console.error("Error blacklisting user:", error);
      toast.error("Failed to blacklist user");
    }
  };

  const handleViewReports = (alumni) => {
    if (alumni.reports.length === 0) {
      toast.info("No reports found for this alumni");
      return;
    }

    const reportCount = alumni.reports.length;
    const reportReasons = alumni.reports.map((r) => r.alasan).join(", ");
    alert(`This alumni has ${reportCount} report(s):\n${reportReasons}`);
  };

  const getStatusBadge = (alumni) => {
    if (alumni.hasReports) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Reported ({alumni.reportCount})
        </Badge>
      );
    }

    if (alumni.isVerified) {
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

  const getDataCompleteness = (alumni) => {
    const fields = [
      alumni.full_name,
      alumni.telephone,
      alumni.graduation_year,
      alumni.batch,
      alumni.domisili,
    ];
    const completedFields = fields.filter(
      (field) => field && field !== null
    ).length;
    const percentage = Math.round((completedFields / fields.length) * 100);

    return { percentage, completedFields, totalFields: fields.length };
  };

  const getStats = () => {
    const total = alumniData.length;
    const verified = alumniData.filter((alumni) => alumni.isVerified).length;
    const reported = alumniData.filter((alumni) => alumni.hasReports).length;
    const pending = total - verified;

    return { total, verified, pending, reported };
  };

  const filteredData = alumniData.filter((alumni) => {
    const matchesSearch =
      alumni.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumni.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumni.batch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumni.telephone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "verified" && alumni.isVerified) ||
      (filterStatus === "pending" && !alumni.isVerified) ||
      (filterStatus === "reported" && alumni.hasReports);

    return matchesSearch && matchesFilter;
  });

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

  const stats = getStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading alumni data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 space-x-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Alumni
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
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

        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.pending}
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

      {/* Alumni Table */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between text-lg font-semibold">
            <CardTitle>Alumni Management</CardTitle>
            <Button onClick={fetchAlumni} variant="outline" size="sm">
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
                  placeholder="Search alumni, batch, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter alumni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alumni</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all"
                  ? "No alumni found matching your criteria"
                  : "No alumni data available"}
              </p>
            </div>
          ) : (
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-150 text-center text-lg">Alumni</TableHead>
                  <TableHead className="w-350 text-center text-lg">Batch</TableHead>
                  <TableHead className="w-150 text-center text-lg">Status</TableHead>
                  <TableHead className="w-150 text-center text-lg">Registered</TableHead>
                  <TableHead className="w-150 text-center text-lg">Data Completeness</TableHead>
                  <TableHead className="w-0 text-center text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((alumni) => {
                  const completeness = getDataCompleteness(alumni);

                  return (
                    <TableRow
                      key={alumni.id}
                      className={
                        alumni.hasReports ? "bg-red-50 border-red-100" : ""
                      }
                    >
                      <TableCell className="px-6 text-base"> 
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-bold">
                              {alumni.name || alumni.full_name || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {alumni.telephone || "No phone"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-base">
                        <Badge variant="outline">{alumni.batch || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="text-center ">{getStatusBadge(alumni)}</TableCell>
                      <TableCell className="text-sm text-gray-500 text-center text-base">
                        {formatDate(alumni.created_at)}
                      </TableCell>
                      <TableCell >
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            {completeness.percentage}%
                          </div>
                          <div className="w-70 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${completeness.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedAlumni(alumni)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Alumni Details</DialogTitle>
                              </DialogHeader>
                              {selectedAlumni && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Name
                                      </Label>
                                      <p className="text-sm text-gray-900 ">
                                        {selectedAlumni.name || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Full Name
                                      </Label>
                                      <p className="text-sm text-gray-900">
                                        {selectedAlumni.full_name || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Phone
                                      </Label>
                                      <p className="text-sm text-gray-900">
                                        {selectedAlumni.telephone || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Batch
                                      </Label>
                                      <p className="text-sm text-gray-900">
                                        {selectedAlumni.batch || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Graduation Year
                                      </Label>
                                      <p className="text-sm text-gray-900">
                                        {selectedAlumni.graduation_year ||
                                          "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Status
                                      </Label>
                                      <div className="mt-1">
                                        {getStatusBadge(selectedAlumni)}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Data Completeness
                                      </Label>
                                      <p className="text-sm text-gray-900">
                                        {
                                          getDataCompleteness(selectedAlumni)
                                            .percentage
                                        }
                                        % (
                                        {
                                          getDataCompleteness(selectedAlumni)
                                            .completedFields
                                        }
                                        /
                                        {
                                          getDataCompleteness(selectedAlumni)
                                            .totalFields
                                        }{" "}
                                        fields)
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Registered
                                      </Label>
                                      <p className="text-sm text-gray-900">
                                        {formatDate(selectedAlumni.created_at)}
                                      </p>
                                    </div>
                                  </div>

                                  {selectedAlumni.domisili && (
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Location
                                      </Label>
                                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                        <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                          {typeof selectedAlumni.domisili ===
                                          "string"
                                            ? selectedAlumni.domisili
                                            : JSON.stringify(
                                                selectedAlumni.domisili,
                                                null,
                                                2
                                              )}
                                        </pre>
                                      </div>
                                    </div>
                                  )}

                                  {selectedAlumni.socials && (
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Social Media
                                      </Label>
                                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                        <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                          {JSON.stringify(
                                            selectedAlumni.socials,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    </div>
                                  )}

                                  {selectedAlumni.reports.length > 0 && (
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Reports
                                      </Label>
                                      <div className="mt-1 space-y-2">
                                        {selectedAlumni.reports.map(
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
                              {alumni.hasReports && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleViewReports(alumni)}
                                  >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    View Reports ({alumni.reportCount})
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {!alumni.isVerified && (
                                <DropdownMenuItem
                                  onClick={() => handleVerifyAlumni(alumni.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify Alumni
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToBlacklist(alumni);
                                  setShowBlacklistDialog(true);
                                }}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Blacklist User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteAlumni(alumni.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Blacklist User Dialog */}
      <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User from Alumni Features</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                User to Blacklist
              </Label>
              <p className="text-sm text-gray-900">
                {userToBlacklist?.name ||
                  userToBlacklist?.full_name ||
                  "Unknown User"}
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
                placeholder="Enter the reason for blacklisting this user from alumni features..."
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
