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
  Calendar,
  MapPin,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KegiatanTable() {
  const [kegiatanData, setKegiatanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchKegiatan();
  }, []);

  const fetchKegiatan = async () => {
    try {
      const { data, error } = await supabase
        .from("kegiatan")
        .select(
          `
          *,
          alumni:creator(name, full_name),
          kegiatan_verification (
            id,
            created_at,
            verificator_id
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKegiatanData(data || []);
    } catch (error) {
      console.error("Error fetching kegiatan:", error);
      toast.error("Failed to fetch kegiatan data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKegiatan = async (kegiatanId) => {
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

  const getStatusBadge = (kegiatan) => {
    const isVerified =
      kegiatan.kegiatan_verification &&
      kegiatan.kegiatan_verification.length > 0;

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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "N/A";
    const date = formatDate(dateString);
    const time = timeString ? ` at ${timeString}` : "";
    return `${date}${time}`;
  };

  const filteredData = kegiatanData.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alumni?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading kegiatan data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Kegiatan Management</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search kegiatan..."
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
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "No kegiatan found" : "No kegiatan data available"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((kegiatan) => {
                const isVerified =
                  kegiatan.kegiatan_verification &&
                  kegiatan.kegiatan_verification.length > 0;

                return (
                  <TableRow key={kegiatan.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{kegiatan.name}</div>
                          <div className="text-sm text-gray-500">
                            by{" "}
                            {kegiatan.alumni?.name ||
                              kegiatan.alumni?.full_name ||
                              "Unknown"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {kegiatan.alumni?.name ||
                          kegiatan.alumni?.full_name ||
                          "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDateTime(
                          kegiatan.kegiatan_date,
                          kegiatan.kegiatan_time
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{kegiatan.address || "No address"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(kegiatan)}
                        {getEventStatusBadge(kegiatan.kegiatan_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Kegiatan Details</DialogTitle>
                            </DialogHeader>
                            {selectedKegiatan && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">
                                      Event Name
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedKegiatan.name}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Organizer
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedKegiatan.alumni?.name ||
                                        selectedKegiatan.alumni?.full_name ||
                                        "Unknown"}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Date
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {formatDate(
                                        selectedKegiatan.kegiatan_date
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Time
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedKegiatan.kegiatan_time || "N/A"}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-sm font-medium">
                                      Address
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedKegiatan.address ||
                                        "No address provided"}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-sm font-medium">
                                      Description
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedKegiatan.description ||
                                        "No description provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Status
                                    </label>
                                    <div className="mt-1 space-y-1">
                                      {getStatusBadge(selectedKegiatan)}
                                      {getEventStatusBadge(
                                        selectedKegiatan.kegiatan_date
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {selectedKegiatan.pelaksana && (
                                  <div>
                                    <label className="text-sm font-medium">
                                      Pelaksana
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {typeof selectedKegiatan.pelaksana ===
                                      "string"
                                        ? selectedKegiatan.pelaksana
                                        : JSON.stringify(
                                            selectedKegiatan.pelaksana,
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
                                onClick={() =>
                                  handleVerifyKegiatan(kegiatan.id)
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Kegiatan
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
