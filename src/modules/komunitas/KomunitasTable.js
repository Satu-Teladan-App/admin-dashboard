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
  Users,
  Instagram,
  MessageCircle,
  AlertTriangle,
  Ban,
  Trash2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KomunitasTable() {
  const [komunitasData, setKomunitasData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKomunitas, setSelectedKomunitas] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [userToBlacklist, setUserToBlacklist] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    fetchKomunitas();
  }, []);

  const fetchKomunitas = async () => {
    try {
      setLoading(true);

      // First, fetch all komunitas with verification, reports, and members
      const { data: komunitasData, error: komunitasError } = await supabase
        .from("komunitas")
        .select(
          `
          *,
          komunitas_verification(id, created_at, verificator_id),
          komunitas_report(id, alasan, created_at, reporter_id),
          komunitas_member(id, alumni_id, created_at)
        `
        )
        .order("created_at", { ascending: false });

      if (komunitasError) throw komunitasError;

      // Get unique creator IDs
      const creatorIds = new Set();
      komunitasData?.forEach((komunitas) => {
        if (komunitas.creator) creatorIds.add(komunitas.creator);
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

      const enrichedData = (komunitasData || []).map((komunitas) => ({
        ...komunitas,
        creatorInfo: alumniMap.get(komunitas.creator) || {
          user_id: komunitas.creator,
          name: "Unknown Creator",
          full_name: "Unknown Creator",
        },
        isVerified: (komunitas.komunitas_verification || []).length > 0,
        hasReports: (komunitas.komunitas_report || []).length > 0,
        reportCount: (komunitas.komunitas_report || []).length,
        memberCount: (komunitas.komunitas_member || []).length,
        reports: komunitas.komunitas_report || [],
        members: komunitas.komunitas_member || [],
      }));

      setKomunitasData(enrichedData);
    } catch (error) {
      console.error("Error fetching komunitas:", error);
      toast.error("Failed to fetch komunitas data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (komunitasId) => {
    try {
      const { data, error } = await supabase
        .from("komunitas_member")
        .select(
          `
          *,
          memberInfo:alumni(id, name, full_name, telephone)
        `
        )
        .eq("komunitas_id", komunitasId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembersList(data || []);
      setShowMembersDialog(true);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch member data");
    }
  };

  const handleVerifyKomunitas = async (komunitasId) => {
    if (!confirm("Are you sure you want to verify this komunitas?")) {
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("komunitas_verification").insert({
        komunitas_id: komunitasId,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;
      toast.success("Komunitas verified successfully");
      fetchKomunitas();
    } catch (error) {
      console.error("Error verifying komunitas:", error);
      toast.error("Failed to verify komunitas");
    }
  };

  const handleDeleteKomunitas = async (komunitasId) => {
    if (
      !confirm(
        "Are you sure you want to delete this komunitas? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("komunitas")
        .delete()
        .eq("id", komunitasId);

      if (error) throw error;
      toast.success("Komunitas deleted successfully");
      fetchKomunitas();
    } catch (error) {
      console.error("Error deleting komunitas:", error);
      toast.error("Failed to delete komunitas");
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
        feature: "komunitas",
        reason: blacklistReason,
        blacklisted_by: user?.user?.id,
        blacklisted_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("User has been blacklisted from komunitas features");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setUserToBlacklist(null);
      fetchKomunitas();
    } catch (error) {
      console.error("Error blacklisting user:", error);
      toast.error("Failed to blacklist user");
    }
  };

  const handleViewReports = (komunitas) => {
    if (komunitas.reports.length === 0) {
      toast.info("No reports found for this komunitas");
      return;
    }

    const reportCount = komunitas.reports.length;
    const reportReasons = komunitas.reports.map((r) => r.alasan).join(", ");
    alert(`This komunitas has ${reportCount} report(s):\n${reportReasons}`);
  };

  const getStatusBadge = (komunitas) => {
    if (komunitas.hasReports) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Reported ({komunitas.reportCount})
        </Badge>
      );
    }

    if (komunitas.isVerified) {
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

  const getStats = () => {
    const total = komunitasData.length;
    const verified = komunitasData.filter((k) => k.isVerified).length;
    const reported = komunitasData.filter((k) => k.hasReports).length;
    const totalMembers = komunitasData.reduce(
      (sum, k) => sum + k.memberCount,
      0
    );

    return { total, verified, reported, totalMembers };
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

  const filteredData = komunitasData.filter((komunitas) => {
    const matchesSearch =
      komunitas.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      komunitas.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      komunitas.creatorInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      komunitas.creatorInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "verified" && komunitas.isVerified) ||
      (filterStatus === "pending" && !komunitas.isVerified) ||
      (filterStatus === "reported" && komunitas.hasReports);

    return matchesSearch && matchesFilter;
  });

  const stats = getStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading komunitas data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6  mr-auto w-11/12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Komunitas
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
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

        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Members
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalMembers}
                </p>
              </div>
              <UserPlus className="w-8 h-8 text-blue-600" />
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

      {/* Komunitas Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Komunitas Management</CardTitle>
            <Button onClick={fetchKomunitas} variant="outline" size="sm">
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
                  placeholder="Search komunitas, creator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter komunitas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Komunitas</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all"
                  ? "No komunitas found matching your criteria"
                  : "No komunitas data available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                 <TableHead className=" w-50 text-center text-lg">Community</TableHead>
                  <TableHead className=" w-50 text-center text-lg">Creator</TableHead>
                  <TableHead className=" w-50 text-center text-lg">Members</TableHead>
                  <TableHead className=" w-50 text-center text-lg">Status</TableHead>
                  <TableHead className=" w-50 text-center text-lg">Created</TableHead>
                  <TableHead className=" w-50 text-center text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((komunitas) => (
                  <TableRow
                    key={komunitas.id}
                    className={
                      komunitas.hasReports ? "bg-red-50 border-red-100" : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          {komunitas.image ? (
                            <img
                              src={komunitas.image}
                              alt={komunitas.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{komunitas.name}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {komunitas.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className=" text-bold ">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                           <div className="font-bold">
                            {komunitas.creatorInfo?.full_name ||
                              komunitas.creatorInfo?.name ||
                              "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {komunitas.creatorInfo?.batch &&
                              `Batch ${komunitas.creatorInfo.batch}`}
                            {komunitas.creatorInfo?.graduation_year &&
                              ` • ${komunitas.creatorInfo.graduation_year}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {komunitas.creatorInfo?.user_id || "No ID"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center" >
                      <div className="flex items-center  justify-center gap-1 text-sm">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">
                          {komunitas.memberCount}
                        </span>
                        <span className="text-gray-500">members</span>
                      </div>
                     </TableCell >
                    <TableCell className="text-center">{getStatusBadge(komunitas)}</TableCell>
                    <TableCell className="text-sm text-gray-500 text-center">
                      {formatDate(komunitas.created_at)}
                    </TableCell>
                    <TableCell className="center"> 
                      <div className="flex   justify-center items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedKomunitas(komunitas)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Komunitas Details</DialogTitle>
                            </DialogHeader>
                            {selectedKomunitas && (
                              <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                                    {selectedKomunitas.image ? (
                                      <img
                                        src={selectedKomunitas.image}
                                        alt={selectedKomunitas.name}
                                        className="w-16 h-16 rounded-lg object-cover"
                                      />
                                    ) : (
                                      <Users className="w-8 h-8 text-purple-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold">
                                      {selectedKomunitas.name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      Created by{" "}
                                      {selectedKomunitas.creatorInfo
                                        ?.full_name ||
                                        selectedKomunitas.creatorInfo?.name ||
                                        "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {selectedKomunitas.creatorInfo?.batch &&
                                        `Batch ${selectedKomunitas.creatorInfo.batch}`}
                                      {selectedKomunitas.creatorInfo
                                        ?.graduation_year &&
                                        ` • ${selectedKomunitas.creatorInfo.graduation_year}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ID:{" "}
                                      {selectedKomunitas.creatorInfo?.user_id ||
                                        "No ID"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Description
                                    </Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm text-gray-900">
                                        {selectedKomunitas.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Members
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedKomunitas.memberCount} members
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Created Date
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {formatDate(selectedKomunitas.created_at)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Status
                                    </Label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedKomunitas)}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Social Links
                                  </Label>
                                  <div className="mt-1 flex gap-2">
                                    {selectedKomunitas.instagram && (
                                      <a
                                        href={selectedKomunitas.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-sm text-pink-600 hover:underline"
                                      >
                                        <Instagram className="w-3 h-3" />
                                        Instagram
                                      </a>
                                    )}
                                    {selectedKomunitas.whatsapp_group && (
                                      <a
                                        href={selectedKomunitas.whatsapp_group}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-sm text-green-600 hover:underline"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        WhatsApp
                                      </a>
                                    )}
                                  </div>
                                  {!selectedKomunitas.instagram &&
                                    !selectedKomunitas.whatsapp_group && (
                                      <p className="text-sm text-gray-500 mt-1">
                                        No social links provided
                                      </p>
                                    )}
                                </div>

                                {selectedKomunitas.reports.length > 0 && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Reports
                                    </Label>
                                    <div className="mt-1 space-y-2">
                                      {selectedKomunitas.reports.map(
                                        (report) => (
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

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      fetchMembers(selectedKomunitas.id)
                                    }
                                  >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    View Members (
                                    {selectedKomunitas.memberCount})
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
                            {komunitas.hasReports && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleViewReports(komunitas)}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  View Reports ({komunitas.reportCount})
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {!komunitas.isVerified && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleVerifyKomunitas(komunitas.id)
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Komunitas
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => fetchMembers(komunitas.id)}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              View Members ({komunitas.memberCount})
                            </DropdownMenuItem>
                            {komunitas.instagram && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={komunitas.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Instagram className="w-4 h-4 mr-2" />
                                  View Instagram
                                </a>
                              </DropdownMenuItem>
                            )}
                            {komunitas.whatsapp_group && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={komunitas.whatsapp_group}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Join WhatsApp
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToBlacklist(komunitas.creatorInfo);
                                setShowBlacklistDialog(true);
                              }}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Blacklist Creator
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                handleDeleteKomunitas(komunitas.id)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Komunitas
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
            <DialogTitle>Blacklist User from Komunitas Features</DialogTitle>
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
                placeholder="Enter the reason for blacklisting this user from komunitas features..."
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

      {/* Members List Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Community Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {membersList.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No members found</p>
            ) : (
              <div className="space-y-2">
                {membersList.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium">
                        {member.memberInfo?.name ||
                          member.memberInfo?.full_name ||
                          "Unknown"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.memberInfo?.telephone || "No phone"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-purple-100 text-purple-800">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Member
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined {formatDate(member.created_at)}
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
