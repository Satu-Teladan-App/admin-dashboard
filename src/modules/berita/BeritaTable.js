"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus,
  ImageIcon,
  ExternalLink,
  Users,
  Clock,
  CheckCircle,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export function BeritaTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [beritaData, setBeritaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newArticle, setNewArticle] = useState({
    title: "",
    category: "",
    link: "",
    publication_date: "",
  });
  const supabase = createClient();

  useEffect(() => {
    fetchBerita();
  }, []);

  const fetchBerita = async () => {
    try {
      const { data, error } = await supabase
        .from("berita")
        .select(
          `
          *,
          alumni:writer(name, full_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBeritaData(data || []);
    } catch (error) {
      console.error("Error fetching berita:", error);
      toast.error("Failed to fetch berita data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (item) => {
    if (item.publication_date) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Dipublikasi
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Review
        </Badge>
      );
    }
  };

  const getKategoriBadge = (kategori) => {
    const colors = {
      Komunitas: "bg-purple-100 text-purple-800",
      Donasi: "bg-orange-100 text-orange-800",
      Kegiatan: "bg-blue-100 text-blue-800",
      Teknologi: "bg-indigo-100 text-indigo-800",
      Edukasi: "bg-green-100 text-green-800",
      Laporan: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge
        className={`${colors[kategori] || "bg-gray-100 text-gray-800"} hover:${
          colors[kategori] || "bg-gray-100"
        }`}
      >
        {kategori || "Umum"}
      </Badge>
    );
  };

  const filteredData = beritaData.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.alumni?.name &&
        item.alumni.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category &&
        item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddArticle = async () => {
    if (!newArticle.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("berita").insert({
        title: newArticle.title,
        category: newArticle.category || null,
        link: newArticle.link || null,
        publication_date: newArticle.publication_date || null,
        auth_uid: user?.user?.id,
      });

      if (error) throw error;

      toast.success("Article added successfully");
      setNewArticle({
        title: "",
        category: "",
        link: "",
        publication_date: "",
      });
      setIsAddModalOpen(false);
      fetchBerita();
    } catch (error) {
      console.error("Error adding article:", error);
      toast.error("Failed to add article");
    }
  };

  const handlePublishArticle = async (id) => {
    try {
      const { error } = await supabase
        .from("berita")
        .update({ publication_date: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Article published successfully");
      fetchBerita();
    } catch (error) {
      console.error("Error publishing article:", error);
      toast.error("Failed to publish article");
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm("Are you sure you want to delete this article?")) {
      return;
    }

    try {
      const { error } = await supabase.from("berita").delete().eq("id", id);

      if (error) throw error;

      toast.success("Article deleted successfully");
      fetchBerita();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Failed to delete article");
    }
  };

  const handleBlacklistWriter = async (authUid) => {
    if (!authUid) {
      toast.error("Cannot blacklist: no user information");
      return;
    }

    if (!confirm("Are you sure you want to blacklist this writer?")) {
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("berita_blacklist").insert({
        user_id: authUid,
        verificator_id: user?.user?.id,
      });

      if (error) throw error;

      toast.success("Writer has been blacklisted");
      fetchBerita();
    } catch (error) {
      console.error("Error blacklisting writer:", error);
      toast.error("Failed to blacklist writer");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Draft";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari artikel, penulis, atau kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Select date
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Artikel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tambah Artikel Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Judul Artikel</Label>
                    <Input
                      id="title"
                      value={newArticle.title}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, title: e.target.value })
                      }
                      placeholder="Masukkan judul artikel..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={newArticle.category}
                      onValueChange={(value) =>
                        setNewArticle({ ...newArticle, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Komunitas">Komunitas</SelectItem>
                        <SelectItem value="Donasi">Donasi</SelectItem>
                        <SelectItem value="Kegiatan">Kegiatan</SelectItem>
                        <SelectItem value="Teknologi">Teknologi</SelectItem>
                        <SelectItem value="Edukasi">Edukasi</SelectItem>
                        <SelectItem value="Laporan">Laporan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="link">Link Artikel</Label>
                    <Input
                      id="link"
                      value={newArticle.link}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, link: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="publication_date">
                      Tanggal Publikasi (opsional)
                    </Label>
                    <Input
                      id="publication_date"
                      type="datetime-local"
                      value={newArticle.publication_date}
                      onChange={(e) =>
                        setNewArticle({
                          ...newArticle,
                          publication_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleAddArticle}>Simpan Artikel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artikel</TableHead>
              <TableHead>Penulis</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.title}
                      className="w-16 h-12 object-cover rounded-lg bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                        {item.title}
                      </div>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Lihat artikel
                        </a>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {item.alumni?.name || item.alumni?.full_name || "Admin"}
                </TableCell>
                <TableCell>{getKategoriBadge(item.category)}</TableCell>
                <TableCell>{getStatusBadge(item)}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDate(item.publication_date || item.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedArticle(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Preview Artikel</DialogTitle>
                        </DialogHeader>
                        {selectedArticle && (
                          <div className="space-y-4">
                            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                              {selectedArticle.image_url ? (
                                <img
                                  src={selectedArticle.image_url}
                                  alt={selectedArticle.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <ImageIcon className="w-16 h-16 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <h2 className="text-xl font-bold mb-2">
                                {selectedArticle.title}
                              </h2>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                <span>
                                  Oleh:{" "}
                                  {selectedArticle.alumni?.name || "Admin"}
                                </span>
                                <span>•</span>
                                <span>
                                  {formatDate(
                                    selectedArticle.publication_date ||
                                      selectedArticle.created_at
                                  )}
                                </span>
                              </div>
                              <div className="flex gap-2 mb-4">
                                {getKategoriBadge(selectedArticle.category)}
                                {getStatusBadge(selectedArticle)}
                              </div>
                              {selectedArticle.link && (
                                <div>
                                  <a
                                    href={selectedArticle.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Buka artikel asli
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Artikel
                        </DropdownMenuItem>
                        {item.link && (
                          <DropdownMenuItem asChild>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Lihat di Website
                            </a>
                          </DropdownMenuItem>
                        )}
                        {!item.publication_date && (
                          <DropdownMenuItem
                            onClick={() => handlePublishArticle(item.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Publikasikan
                          </DropdownMenuItem>
                        )}
                        {item.auth_uid && (
                          <DropdownMenuItem
                            onClick={() => handleBlacklistWriter(item.auth_uid)}
                            className="text-orange-600"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Blacklist Penulis
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteArticle(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm
                ? "Tidak ada artikel yang ditemukan"
                : "Belum ada artikel"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
