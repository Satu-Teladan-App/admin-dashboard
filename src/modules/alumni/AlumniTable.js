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
  XCircle,
  Clock,
  MoreVertical,
  User,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function AlumniDataTable() {
  const [alumniData, setAlumniData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from("alumni")
        .select(
          `
          *,
          alumni_verification (
            id,
            created_at,
            verificator_id
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlumniData(data || []);
    } catch (error) {
      console.error("Error fetching alumni:", error);
      toast.error("Failed to fetch alumni data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAlumni = async (alumniId) => {
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

  const getStatusBadge = (alumni) => {
    const isVerified =
      alumni.alumni_verification && alumni.alumni_verification.length > 0;

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
    const verified = alumniData.filter(
      (alumni) =>
        alumni.alumni_verification && alumni.alumni_verification.length > 0
    ).length;
    const pending = total - verified;

    return { total, verified, pending };
  };

  const filteredData = alumniData.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading alumni data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-gray-600">
              Total Alumni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-gray-600">
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-100">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-gray-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alumni Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alumni Management</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search alumni..."
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
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "No alumni found" : "No alumni data available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumni</TableHead>
                  <TableHead>Angkatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Data Completeness</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((alumni) => {
                  const completeness = getDataCompleteness(alumni);
                  const isVerified =
                    alumni.alumni_verification &&
                    alumni.alumni_verification.length > 0;

                  return (
                    <TableRow key={alumni.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {alumni.name || alumni.full_name || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {alumni.telephone || "No phone"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{alumni.batch || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(alumni)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(alumni.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            {completeness.percentage}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
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
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Alumni Details</DialogTitle>
                              </DialogHeader>
                              {selectedAlumni && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">
                                        Name
                                      </label>
                                      <p className="text-sm text-gray-600">
                                        {selectedAlumni.name || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">
                                        Full Name
                                      </label>
                                      <p className="text-sm text-gray-600">
                                        {selectedAlumni.full_name || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">
                                        Phone
                                      </label>
                                      <p className="text-sm text-gray-600">
                                        {selectedAlumni.telephone || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">
                                        Batch
                                      </label>
                                      <p className="text-sm text-gray-600">
                                        {selectedAlumni.batch || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">
                                        Graduation Year
                                      </label>
                                      <p className="text-sm text-gray-600">
                                        {selectedAlumni.graduation_year ||
                                          "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">
                                        Status
                                      </label>
                                      <div className="mt-1">
                                        {getStatusBadge(selectedAlumni)}
                                      </div>
                                    </div>
                                  </div>
                                  {selectedAlumni.domisili && (
                                    <div>
                                      <label className="text-sm font-medium">
                                        Location
                                      </label>
                                      <p className="text-sm text-gray-600">
                                        {typeof selectedAlumni.domisili ===
                                        "string"
                                          ? selectedAlumni.domisili
                                          : JSON.stringify(
                                              selectedAlumni.domisili
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
                                  onClick={() => handleVerifyAlumni(alumni.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Verify Alumni
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
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
    </div>
  );
}
