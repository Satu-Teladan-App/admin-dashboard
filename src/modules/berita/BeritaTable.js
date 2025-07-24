"use client";

import { useState } from "react";
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

const beritaData = [
  {
    id: 1,
    judul: "Komunitas Pemuda Kreatif Gelar Workshop Digital Marketing",
    penulis: "Admin Redaksi",
    kategori: "Komunitas",
    tanggalPublish: "25/04/24",
    status: "Dipublikasi",
    views: "1,245",
    gambar: "/placeholder.svg?height=60&width=80&text=News1",
    ringkasan:
      "Workshop digital marketing yang diselenggarakan oleh Komunitas Pemuda Kreatif berhasil menarik 150 peserta dari berbagai kalangan...",
    tags: ["Workshop", "Digital Marketing", "Pemuda"],
  },
  {
    id: 2,
    judul: "Program Donasi Pendidikan Capai Target 100 Juta Rupiah",
    penulis: "Sarah Wijaya",
    kategori: "Donasi",
    tanggalPublish: "24/04/24",
    status: "Dipublikasi",
    views: "2,156",
    gambar: "/placeholder.svg?height=60&width=80&text=News2",
    ringkasan:
      "Program donasi untuk pendidikan anak kurang mampu berhasil mencapai target pengumpulan dana sebesar 100 juta rupiah...",
    tags: ["Donasi", "Pendidikan", "Sosial"],
  },
  {
    id: 3,
    judul: "Kegiatan Bakti Sosial Pembersihan Pantai Diikuti 200 Relawan",
    penulis: "Budi Santoso",
    kategori: "Kegiatan",
    tanggalPublish: "23/04/24",
    status: "Review",
    views: "0",
    gambar: "/placeholder.svg?height=60&width=80&text=News3",
    ringkasan:
      "Kegiatan bakti sosial pembersihan pantai yang diinisiasi oleh komunitas lingkungan berhasil mengumpulkan 200 relawan...",
    tags: ["Bakti Sosial", "Lingkungan", "Relawan"],
  },
  {
    id: 4,
    judul: "Peluncuran Fitur Baru: Sistem Verifikasi Otomatis",
    penulis: "Tim Teknis",
    kategori: "Teknologi",
    tanggalPublish: "22/04/24",
    status: "Draft",
    views: "0",
    gambar: "/placeholder.svg?height=60&width=80&text=News4",
    ringkasan:
      "Sistem verifikasi otomatis yang baru diluncurkan akan mempercepat proses approval untuk berbagai pengajuan...",
    tags: ["Teknologi", "Fitur Baru", "Sistem"],
  },
  {
    id: 5,
    judul: "Seminar Kewirausahaan: Membangun Bisnis di Era Digital",
    penulis: "Maya Sari",
    kategori: "Edukasi",
    tanggalPublish: "21/04/24",
    status: "Dipublikasi",
    views: "987",
    gambar: "/placeholder.svg?height=60&width=80&text=News5",
    ringkasan:
      "Seminar kewirausahaan yang menghadirkan para pengusaha sukses memberikan insight tentang membangun bisnis digital...",
    tags: ["Seminar", "Kewirausahaan", "Bisnis"],
  },
  {
    id: 6,
    judul: "Laporan Tahunan: Pencapaian Platform Tahun 2024",
    penulis: "Admin Redaksi",
    kategori: "Laporan",
    tanggalPublish: "20/04/24",
    status: "Dipublikasi",
    views: "3,421",
    gambar: "/placeholder.svg?height=60&width=80&text=News6",
    ringkasan:
      "Laporan tahunan menunjukkan pertumbuhan signifikan dalam jumlah pengguna dan aktivitas platform selama tahun 2024...",
    tags: ["Laporan", "Tahunan", "Statistik"],
  },
];

export function BeritaTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newArticle, setNewArticle] = useState({
    judul: "",
    kategori: "",
    ringkasan: "",
    konten: "",
    tags: "",
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Dipublikasi":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Dipublikasi
          </Badge>
        );
      case "Review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Review
          </Badge>
        );
      case "Draft":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <Edit className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case "Ditolak":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Ditolak
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
        {kategori}
      </Badge>
    );
  };

  const filteredData = beritaData.filter(
    (item) =>
      item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.penulis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddArticle = () => {
    // Handle add article logic here
    console.log("New article:", newArticle);
    setNewArticle({
      judul: "",
      kategori: "",
      ringkasan: "",
      konten: "",
      tags: "",
    });
    setIsAddModalOpen(false);
  };

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
                    <Label htmlFor="judul">Judul Artikel</Label>
                    <Input
                      id="judul"
                      value={newArticle.judul}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, judul: e.target.value })
                      }
                      placeholder="Masukkan judul artikel..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="kategori">Kategori</Label>
                    <Select
                      value={newArticle.kategori}
                      onValueChange={(value) =>
                        setNewArticle({ ...newArticle, kategori: value })
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
                    <Label htmlFor="ringkasan">Ringkasan</Label>
                    <Textarea
                      id="ringkasan"
                      value={newArticle.ringkasan}
                      onChange={(e) =>
                        setNewArticle({
                          ...newArticle,
                          ringkasan: e.target.value,
                        })
                      }
                      placeholder="Tulis ringkasan artikel..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="konten">Konten Artikel</Label>
                    <Textarea
                      id="konten"
                      value={newArticle.konten}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, konten: e.target.value })
                      }
                      placeholder="Tulis konten lengkap artikel..."
                      rows={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (pisahkan dengan koma)</Label>
                    <Input
                      id="tags"
                      value={newArticle.tags}
                      onChange={(e) =>
                        setNewArticle({ ...newArticle, tags: e.target.value })
                      }
                      placeholder="contoh: teknologi, inovasi, digital"
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
              <TableHead>Views</TableHead>
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
                      src={item.gambar || "/placeholder.svg"}
                      alt={item.judul}
                      className="w-16 h-12 object-cover rounded-lg bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                        {item.judul}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {item.ringkasan}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{item.penulis}</TableCell>
                <TableCell>{getKategoriBadge(item.kategori)}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="w-3 h-3 text-gray-400" />
                    {item.views}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {item.tanggalPublish}
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
                              <ImageIcon className="w-16 h-16 text-gray-400" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold mb-2">
                                {selectedArticle.judul}
                              </h2>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                <span>Oleh: {selectedArticle.penulis}</span>
                                <span>•</span>
                                <span>{selectedArticle.tanggalPublish}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {selectedArticle.views} views
                                </div>
                              </div>
                              <div className="flex gap-2 mb-4">
                                {getKategoriBadge(selectedArticle.kategori)}
                                {getStatusBadge(selectedArticle.status)}
                              </div>
                            </div>
                            <div>
                              <h3 className="font-semibold mb-2">Ringkasan</h3>
                              <p className="text-gray-700">
                                {selectedArticle.ringkasan}
                              </p>
                            </div>
                            <div>
                              <h3 className="font-semibold mb-2">Tags</h3>
                              <div className="flex flex-wrap gap-2">
                                {selectedArticle.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
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
                        <DropdownMenuItem>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Lihat di Website
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Publikasikan
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
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
      </CardContent>
    </Card>
  );
}
