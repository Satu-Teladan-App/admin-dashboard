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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  MoreVertical,
  Wallet,
  Calendar,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function PendanaanTable() {
  const [donasiData, setDonasiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonasi, setSelectedDonasi] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchDonasi();
  }, []);

  const fetchDonasi = async () => {
    try {
      const { data, error } = await supabase
        .from("donasi")
        .select(
          `
          *,
          alumni:creator(name, full_name),
          donasi_verification (
            id,
            created_at,
            verificator_id
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonasiData(data || []);
    } catch (error) {
      console.error("Error fetching donasi:", error);
      toast.error("Failed to fetch donasi data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDonasi = async (donasiId) => {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("donasi_verification").insert({
        donasi_id: donasiId,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;

      toast.success("Donasi verified successfully");
      fetchDonasi();
    } catch (error) {
      console.error("Error verifying donasi:", error);
      toast.error("Failed to verify donasi");
    }
  };

  const getStatusBadge = (donasi) => {
    const isVerified =
      donasi.donasi_verification && donasi.donasi_verification.length > 0;

    if (isVerified) {
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
    });
  };

  const filteredData = donasiData.filter(
    (item) =>
      item.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.organizer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alumni?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading donasi data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pendanaan Management</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search donasi..."
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
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "No donasi found" : "No donasi data available"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((donasi) => {
                const progressPercentage = getProgressPercentage(donasi);
                const isVerified =
                  donasi.donasi_verification &&
                  donasi.donasi_verification.length > 0;
                const expired = isExpired(donasi.end_date);

                return (
                  <TableRow key={donasi.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium">{donasi.event_name}</div>
                          <div className="text-sm text-gray-500">
                            by{" "}
                            {donasi.alumni?.name ||
                              donasi.alumni?.full_name ||
                              "Unknown"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{donasi.organizer}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatCurrency(donasi.target_amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{formatCurrency(donasi.progress)}</span>
                          <span className="text-gray-500">
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(progressPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(donasi)}
                        {expired && (
                          <Badge variant="destructive" className="block w-fit">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(donasi.end_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Donasi Details</DialogTitle>
                            </DialogHeader>
                            {selectedDonasi && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">
                                      Event Name
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedDonasi.event_name}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Organizer
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedDonasi.organizer}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Target Amount
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {formatCurrency(
                                        selectedDonasi.target_amount
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Current Progress
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {formatCurrency(selectedDonasi.progress)}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      End Date
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {formatDate(selectedDonasi.end_date)}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Status
                                    </label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedDonasi)}
                                    </div>
                                  </div>
                                </div>
                                {selectedDonasi.payment_info && (
                                  <div>
                                    <label className="text-sm font-medium">
                                      Payment Info
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {typeof selectedDonasi.payment_info ===
                                      "string"
                                        ? selectedDonasi.payment_info
                                        : JSON.stringify(
                                            selectedDonasi.payment_info,
                                            null,
                                            2
                                          )}
                                    </p>
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
                            {!isVerified && (
                              <DropdownMenuItem
                                onClick={() => handleVerifyDonasi(donasi.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Donasi
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
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
  );
}
