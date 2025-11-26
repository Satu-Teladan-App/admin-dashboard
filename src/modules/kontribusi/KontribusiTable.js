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
  MoreVertical,
  User,
  Trash2,
  RefreshCw,
  Coins,
  Zap,
  Trophy,
  Target,
  Heart,
  Calendar,
  Gift,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KontribusiTable() {
  const [kontribusiData, setKontribusiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKontribusi, setSelectedKontribusi] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    fetchKontribusi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchKontribusi = async () => {
    try {
      setLoading(true);

      // Fetch all contributions with relationships
      const { data: kontribusiData, error: kontribusiError } = await supabase
        .from("contribution")
        .select(
          `
          *,
          alumni (
            id,
            name,
            full_name,
            telephone,
            batch,
            avatar
          ),
          tantangan (
            id,
            name,
            type,
            description
          ),
          donasi (
            id,
            event_name,
            organizer,
            target_amount,
            progress
          )
        `
        )
        .order("created_at", { ascending: false });

      if (kontribusiError) throw kontribusiError;

      const enrichedData = (kontribusiData || []).map((kontribusi) => {
        // Determine contribution type
        let contributionType = "unknown";
        if (kontribusi.tantangan_id && kontribusi.tantangan) {
          contributionType = "tantangan";
        } else if (kontribusi.donasi_id && kontribusi.donasi) {
          contributionType = "donasi";
        }

        return {
          ...kontribusi,
          contributionType,
        };
      });

      setKontribusiData(enrichedData);
    } catch (error) {
      console.error("Error fetching kontribusi:", error);
      toast.error("Failed to fetch kontribusi data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKontribusi = async (kontribusiId) => {
    if (
      !confirm(
        "Are you sure you want to delete this contribution? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("contribution")
        .delete()
        .eq("id", kontribusiId);

      if (error) throw error;
      toast.success("Contribution deleted successfully");
      fetchKontribusi();
    } catch (error) {
      console.error("Error deleting kontribusi:", error);
      toast.error("Failed to delete contribution");
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "tantangan":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <Target className="w-3 h-3 mr-1" />
            Tantangan
          </Badge>
        );
      case "donasi":
        return (
          <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100">
            <Heart className="w-3 h-3 mr-1" />
            Donasi
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <Gift className="w-3 h-3 mr-1" />
            Other
          </Badge>
        );
    }
  };

  const getStats = () => {
    const total = kontribusiData.length;
    const totalCoins = kontribusiData.reduce(
      (sum, k) => sum + (k.coin_earned || 0),
      0
    );
    const totalEnergy = kontribusiData.reduce(
      (sum, k) => sum + (k.energy_earned || 0),
      0
    );
    const tantanganCount = kontribusiData.filter(
      (k) => k.contributionType === "tantangan"
    ).length;
    const donasiCount = kontribusiData.filter(
      (k) => k.contributionType === "donasi"
    ).length;

    return { total, totalCoins, totalEnergy, tantanganCount, donasiCount };
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

  const filteredData = kontribusiData.filter((kontribusi) => {
    const matchesSearch =
      kontribusi.alumni?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      kontribusi.alumni?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      kontribusi.tantangan?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      kontribusi.donasi?.event_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" || kontribusi.contributionType === filterType;

    return matchesSearch && matchesType;
  });

  const stats = getStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading kontribusi data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mr-auto w-11/12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Kontribusi
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Coins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalCoins.toLocaleString()}
                </p>
              </div>
              <Coins className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Energy
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEnergy.toLocaleString()}
                </p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tantangan</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.tantanganCount}
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-pink-50 border-pink-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Donasi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.donasiCount}
                </p>
              </div>
              <Heart className="w-8 h-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kontribusi Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Kontribusi Management</CardTitle>
            <Button onClick={fetchKontribusi} variant="outline" size="sm">
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
                  placeholder="Search alumni, tantangan, donasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="tantangan">Tantangan</SelectItem>
                  <SelectItem value="donasi">Donasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterType !== "all"
                  ? "No contributions found matching your criteria"
                  : "No contribution data available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center text-lg">Alumni</TableHead>
                  <TableHead className="text-center text-lg">Type</TableHead>
                  <TableHead className="text-center text-lg">Source</TableHead>
                  <TableHead className="text-center text-lg">
                    Coins Earned
                  </TableHead>
                  <TableHead className="text-center text-lg">
                    Energy Earned
                  </TableHead>
                  <TableHead className="text-center text-lg">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-center text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((kontribusi) => (
                  <TableRow key={kontribusi.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {kontribusi.alumni?.avatar ? (
                            <img
                              src={kontribusi.alumni.avatar}
                              alt={kontribusi.alumni.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {kontribusi.alumni?.full_name ||
                              kontribusi.alumni?.name ||
                              "Unknown Alumni"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {kontribusi.alumni?.batch
                              ? `Batch ${kontribusi.alumni.batch}`
                              : "No batch info"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTypeBadge(kontribusi.contributionType)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {kontribusi.contributionType === "tantangan" &&
                          kontribusi.tantangan && (
                            <div>
                              <div className="font-medium text-purple-700">
                                {kontribusi.tantangan.name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                Type: {kontribusi.tantangan.type}
                              </div>
                            </div>
                          )}
                        {kontribusi.contributionType === "donasi" &&
                          kontribusi.donasi && (
                            <div>
                              <div className="font-medium text-pink-700">
                                {kontribusi.donasi.event_name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                By: {kontribusi.donasi.organizer}
                              </div>
                            </div>
                          )}
                        {kontribusi.contributionType === "unknown" && (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-yellow-700">
                          {kontribusi.coin_earned || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-700">
                          {kontribusi.energy_earned || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">
                      {formatDate(
                        kontribusi.timestamp || kontribusi.created_at
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedKontribusi(kontribusi)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Kontribusi Details</DialogTitle>
                            </DialogHeader>
                            {selectedKontribusi && (
                              <div className="space-y-6">
                                {/* Alumni Info */}
                                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    {selectedKontribusi.alumni?.avatar ? (
                                      <img
                                        src={selectedKontribusi.alumni.avatar}
                                        alt={selectedKontribusi.alumni.name}
                                        className="w-16 h-16 rounded-full object-cover"
                                      />
                                    ) : (
                                      <User className="w-8 h-8 text-blue-600" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold">
                                      {selectedKontribusi.alumni?.full_name ||
                                        selectedKontribusi.alumni?.name ||
                                        "Unknown Alumni"}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      {selectedKontribusi.alumni?.batch &&
                                        `Batch ${selectedKontribusi.alumni.batch}`}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {selectedKontribusi.alumni?.telephone ||
                                        "No phone"}
                                    </p>
                                  </div>
                                </div>

                                {/* Contribution Details */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Contribution Type
                                    </Label>
                                    <div className="mt-1">
                                      {getTypeBadge(
                                        selectedKontribusi.contributionType
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Timestamp
                                    </Label>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {formatDate(
                                        selectedKontribusi.timestamp ||
                                          selectedKontribusi.created_at
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Coins Earned
                                    </Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Coins className="w-4 h-4 text-yellow-500" />
                                      <span className="text-lg font-bold text-yellow-700">
                                        {selectedKontribusi.coin_earned || 0}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Energy Earned
                                    </Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Zap className="w-4 h-4 text-green-500" />
                                      <span className="text-lg font-bold text-green-700">
                                        {selectedKontribusi.energy_earned || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Remaining Energy */}
                                {selectedKontribusi.remaining_energy_to_be_claimed !==
                                  null && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700">
                                      Remaining Energy to be Claimed
                                    </Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Zap className="w-4 h-4 text-orange-500" />
                                      <span className="text-lg font-bold text-orange-700">
                                        {
                                          selectedKontribusi.remaining_energy_to_be_claimed
                                        }
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Tantangan Details */}
                                {selectedKontribusi.contributionType ===
                                  "tantangan" &&
                                  selectedKontribusi.tantangan && (
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Tantangan Details
                                      </Label>
                                      <div className="mt-1 p-3 bg-purple-50 rounded-lg">
                                        <p className="text-sm font-medium text-purple-800">
                                          {selectedKontribusi.tantangan.name}
                                        </p>
                                        <p className="text-xs text-purple-600 mt-1">
                                          Type:{" "}
                                          {selectedKontribusi.tantangan.type}
                                        </p>
                                        {selectedKontribusi.tantangan
                                          .description && (
                                          <p className="text-xs text-purple-600 mt-1">
                                            {
                                              selectedKontribusi.tantangan
                                                .description
                                            }
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Donasi Details */}
                                {selectedKontribusi.contributionType ===
                                  "donasi" &&
                                  selectedKontribusi.donasi && (
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700">
                                        Donasi Details
                                      </Label>
                                      <div className="mt-1 p-3 bg-pink-50 rounded-lg">
                                        <p className="text-sm font-medium text-pink-800">
                                          {selectedKontribusi.donasi.event_name}
                                        </p>
                                        <p className="text-xs text-pink-600 mt-1">
                                          Organizer:{" "}
                                          {selectedKontribusi.donasi.organizer}
                                        </p>
                                        <p className="text-xs text-pink-600">
                                          Target: Rp{" "}
                                          {selectedKontribusi.donasi.target_amount?.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-pink-600">
                                          Progress:{" "}
                                          {selectedKontribusi.donasi.progress}%
                                        </p>
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
                              className="text-red-600"
                              onClick={() =>
                                handleDeleteKontribusi(kontribusi.id)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Contribution
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
