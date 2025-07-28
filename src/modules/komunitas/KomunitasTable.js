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
  Users,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function KomunitasTable() {
  const [komunitasData, setKomunitasData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKomunitas, setSelectedKomunitas] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchKomunitas();
  }, []);

  const fetchKomunitas = async () => {
    try {
      const { data, error } = await supabase
        .from("komunitas")
        .select(
          `
          *,
          alumni:creator(name, full_name),
          komunitas_verification (
            id,
            created_at,
            verificator_id
          ),
          komunitas_admin (
            id,
            user_id
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKomunitasData(data || []);
    } catch (error) {
      console.error("Error fetching komunitas:", error);
      toast.error("Failed to fetch komunitas data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKomunitas = async (komunitasId) => {
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

  const getStatusBadge = (komunitas) => {
    const isVerified =
      komunitas.komunitas_verification &&
      komunitas.komunitas_verification.length > 0;

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

  const getMemberCount = (komunitas) => {
    return komunitas.komunitas_admin ? komunitas.komunitas_admin.length : 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredData = komunitasData.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alumni?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading komunitas data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Komunitas Management</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search komunitas..."
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
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm
                ? "No komunitas found"
                : "No komunitas data available"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Community</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((komunitas) => {
                const isVerified =
                  komunitas.komunitas_verification &&
                  komunitas.komunitas_verification.length > 0;
                const memberCount = getMemberCount(komunitas);

                return (
                  <TableRow key={komunitas.id}>
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
                    <TableCell>
                      <div className="text-sm">
                        {komunitas.alumni?.name ||
                          komunitas.alumni?.full_name ||
                          "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span>{memberCount} members</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(komunitas)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(komunitas.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Komunitas Details</DialogTitle>
                            </DialogHeader>
                            {selectedKomunitas && (
                              <div className="space-y-4">
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
                                      {selectedKomunitas.alumni?.name ||
                                        selectedKomunitas.alumni?.full_name ||
                                        "Unknown"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">
                                      Description
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {selectedKomunitas.description}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Members
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {getMemberCount(selectedKomunitas)}{" "}
                                      members
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Created Date
                                    </label>
                                    <p className="text-sm text-gray-600">
                                      {formatDate(selectedKomunitas.created_at)}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">
                                      Status
                                    </label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedKomunitas)}
                                    </div>
                                  </div>
                                </div>

                                {/* Social Links */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">
                                    Social Links
                                  </label>
                                  <div className="flex gap-2">
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
                                      <p className="text-sm text-gray-500">
                                        No social links provided
                                      </p>
                                    )}
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
                            {!isVerified && (
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
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
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
