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
  Wallet,
  Calendar,
  AlertTriangle,
  Ban,
  Trash2,
  RefreshCw,
  X,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function PendanaanTable() {
  const [donasiData, setDonasiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonasi, setSelectedDonasi] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [userToBlacklist, setUserToBlacklist] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    fetchDonasi();
  }, []);

  const fetchDonasi = async () => {
    try {
      setLoading(true);

      // First, fetch all donasi with reports and transactions
      const { data: donasiData, error: donasiError } = await supabase
        .from("donasi")
        .select(
          `
          *,
          donasi_verification(id, created_at, verificator_id),
          donasi_report(id, alasan, created_at, reporter_id),
          donasi_transaction(id, amount, created_at)
        `
        )
        .order("created_at", { ascending: false });

      if (donasiError) throw donasiError;

      // Get unique creator IDs
      const creatorIds = new Set();
      donasiData?.forEach((donasi) => {
        if (donasi.creator) creatorIds.add(donasi.creator);
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

      const enrichedData = (donasiData || []).map((donasi) => ({
        ...donasi,
        creatorInfo: alumniMap.get(donasi.creator) || {
          user_id: donasi.creator,
          name: "Unknown Creator",
          full_name: "Unknown Creator",
        },
        isVerified: (donasi.donasi_verification || []).length > 0,
        hasReports: (donasi.donasi_report || []).length > 0,
        reportCount: (donasi.donasi_report || []).length,
        transactionCount: (donasi.donasi_transaction || []).length,
        reports: donasi.donasi_report || [],
        transactions: donasi.donasi_transaction || [],
      }));

      setDonasiData(enrichedData);
    } catch (error) {
      console.error("Error fetching donasi:", error);
      toast.error("Failed to fetch donasi data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (donasiId) => {
    try {
      const { data, error } = await supabase
        .from("donasi_transaction")
        .select("*")
        .eq("donasi_id", donasiId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      setShowTransactions(true);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transaction data");
    }
  };

  const handleVerifyDonasi = async (donasiId) => {
    if (!confirm("Are you sure you want to verify this donation campaign?")) {
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("donasi_verification").insert({
        donasi_id: donasiId,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;
      toast.success("Donation campaign verified successfully");
      fetchDonasi();
    } catch (error) {
      console.error("Error verifying donasi:", error);
      toast.error("Failed to verify donation campaign");
    }
  };

  const handleDeleteDonasi = async (donasiId) => {
    if (
      !confirm(
        "Are you sure you want to delete this donation campaign? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("donasi")
        .delete()
        .eq("id", donasiId);

      if (error) throw error;
      toast.success("Donation campaign deleted successfully");
      fetchDonasi();
    } catch (error) {
      console.error("Error deleting donasi:", error);
      toast.error("Failed to delete donation campaign");
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
        feature: "donasi",
        reason: blacklistReason,
        blacklisted_by: user?.user?.id,
        blacklisted_at: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("User has been blacklisted from donation features");
      setShowBlacklistDialog(false);
      setBlacklistReason("");
      setUserToBlacklist(null);
      fetchDonasi();
    } catch (error) {
      console.error("Error blacklisting user:", error);
      toast.error("Failed to blacklist user");
    }
  };

  const handleViewReports = (donasi) => {
    if (donasi.reports.length === 0) {
      toast.info("No reports found for this donation campaign");
      return;
    }

    const reportCount = donasi.reports.length;
    const reportReasons = donasi.reports.map((r) => r.alasan).join(", ");
    alert(
      `This donation campaign has ${reportCount} report(s):\n${reportReasons}`
    );
  };

  const getStatusBadge = (donasi) => {
    if (donasi.hasReports) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Reported ({donasi.reportCount})
        </Badge>
      );
    }

    if (donasi.isVerified) {
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

  const getProgressPercentage = (donasi) => {
    if (!donasi.target_amount || donasi.target_amount === 0) return 0;
    return Math.round((donasi.progress / donasi.target_amount) * 100);
  };

  const isExpired = (endDate) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
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

  const filteredData = donasiData.filter((donasi) => {
    const matchesSearch =
      donasi.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donasi.organizer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donasi.creatorInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      donasi.creatorInfo?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "verified" && donasi.isVerified) ||
      (filterStatus === "pending" && !donasi.isVerified) ||
      (filterStatus === "reported" && donasi.hasReports) ||
      (filterStatus === "expired" && isExpired(donasi.end_date));

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading donation campaigns...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Donation Campaign Management</CardTitle>
          <Button onClick={fetchDonasi} variant="outline" size="sm">
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
                placeholder="Search campaigns, organizers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterStatus !== "all"
                ? "No donation campaigns found matching your criteria"
                : "No donation campaigns available"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className=" w-100 text-center text-lg">Campaign</TableHead>
                <TableHead className=" w-100 text-center text-lg">Creator</TableHead>
                <TableHead className=" w-100 text-center text-lg">Target</TableHead>
                <TableHead className=" w-100 text-center text-lg">Progress</TableHead>
                <TableHead className=" w-100 text-center text-lg">Status</TableHead>
                <TableHead className=" w-100 text-center text-lg">End Date</TableHead>
                <TableHead className=" w-100 text-center text-lg">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((donasi) => {
                const progressPercentage = getProgressPercentage(donasi);
                const expired = isExpired(donasi.end_date);

                return (
                  <TableRow
                    key={donasi.id}
                    className={
                      donasi.hasReports ? "bg-red-50 border-red-100" : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3 ">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium">{donasi.event_name}</div>
                          <div className="text-sm text-gray-500">
                            {donasi.organizer}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {donasi.creatorInfo?.full_name ||
                              donasi.creatorInfo?.name ||
                              "Unknown User"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {donasi.creatorInfo?.batch &&
                              `Batch ${donasi.creatorInfo.batch}`}
                            {donasi.creatorInfo?.graduation_year &&
                              ` • ${donasi.creatorInfo.graduation_year}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {donasi.creatorInfo?.user_id || "No ID"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm  text-center font-medium">
                        {formatCurrency(donasi.target_amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{formatCurrency(donasi.progress)}</span>
                          <span className="text-gray-500">
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full "
                            style={{
                              width: `${Math.min(progressPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                        {donasi.transactionCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {donasi.transactionCount} transactions
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="justify-center flex items-center gap-2">
                        {getStatusBadge(donasi)}
                        {expired && (
                          <Badge variant="destructive" className="block w-fit">
                            <X className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 ">
                      <div className="flex items-center gap-1 justify-center">
                        <Calendar className="w-3 h-3" />
                        {formatDate(donasi.end_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDonasi(donasi)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>
                                Donation Campaign Details
                              </DialogTitle>
                            </DialogHeader>
                            {selectedDonasi && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Campaign Name
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedDonasi.event_name}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Organizer
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedDonasi.organizer}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Creator
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedDonasi.creatorInfo?.full_name ||
                                        selectedDonasi.creatorInfo?.name ||
                                        "Unknown User"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {selectedDonasi.creatorInfo?.batch &&
                                        `Batch ${selectedDonasi.creatorInfo.batch}`}
                                      {selectedDonasi.creatorInfo
                                        ?.graduation_year &&
                                        ` • ${selectedDonasi.creatorInfo.graduation_year}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ID:{" "}
                                      {selectedDonasi.creatorInfo?.user_id ||
                                        "No ID"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Target Amount
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {formatCurrency(
                                        selectedDonasi.target_amount
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Current Progress
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {formatCurrency(selectedDonasi.progress)}{" "}
                                      ({getProgressPercentage(selectedDonasi)}%)
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      End Date
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {formatDate(selectedDonasi.end_date)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Status
                                    </Label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedDonasi)}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Transactions
                                    </Label>
                                    <p className="text-sm text-gray-900">
                                      {selectedDonasi.transactionCount}{" "}
                                      transactions
                                    </p>
                                  </div>
                                </div>

                                {selectedDonasi.payment_info && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Payment Information
                                    </Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                                        {typeof selectedDonasi.payment_info ===
                                        "string"
                                          ? selectedDonasi.payment_info
                                          : JSON.stringify(
                                              selectedDonasi.payment_info,
                                              null,
                                              2
                                            )}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {selectedDonasi.reports.length > 0 && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Reports
                                    </Label>
                                    <div className="mt-1 space-y-2">
                                      {selectedDonasi.reports.map(
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

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      fetchTransactions(selectedDonasi.id)
                                    }
                                  >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    View Transactions
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
                            {donasi.hasReports && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleViewReports(donasi)}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  View Reports ({donasi.reportCount})
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {!donasi.isVerified && (
                              <DropdownMenuItem
                                onClick={() => handleVerifyDonasi(donasi.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Campaign
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => fetchTransactions(donasi.id)}
                            >
                              <TrendingUp className="w-4 h-4 mr-2" />
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToBlacklist(donasi.creatorInfo);
                                setShowBlacklistDialog(true);
                              }}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Blacklist Creator
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteDonasi(donasi.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Campaign
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

        {/* Blacklist User Dialog */}
        <Dialog
          open={showBlacklistDialog}
          onOpenChange={setShowBlacklistDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Blacklist User from Donation Features</DialogTitle>
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
                  placeholder="Enter the reason for blacklisting this user from donation features..."
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

        {/* Transactions Dialog */}
        <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Campaign Transactions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No transactions found
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Donation
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
