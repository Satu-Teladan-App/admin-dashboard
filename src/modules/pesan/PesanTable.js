"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  Eye,
  Reply,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  AlertCircle,
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

const pesanData = [
  {
    id: 1,
    pengirim: "Ahmad Rizki",
    email: "ahmad.rizki@email.com",
    subjek: "Pertanyaan tentang pendaftaran komunitas",
    pesan:
      "Selamat pagi, saya ingin menanyakan tentang syarat-syarat pendaftaran komunitas baru. Apakah ada dokumen khusus yang perlu disiapkan?",
    tanggal: "25/04/24 10:30",
    status: "Belum Dibaca",
    prioritas: "Normal",
    kategori: "Komunitas",
  },
  {
    id: 2,
    pengirim: "Siti Nurhaliza",
    email: "siti.nurhaliza@email.com",
    subjek: "Masalah login akun",
    pesan:
      "Saya mengalami kesulitan untuk login ke akun saya. Sudah mencoba reset password tapi email tidak masuk. Mohon bantuannya.",
    tanggal: "25/04/24 09:15",
    status: "Sudah Dibaca",
    prioritas: "Tinggi",
    kategori: "Teknis",
  },
  {
    id: 3,
    pengirim: "Budi Santoso",
    email: "budi.santoso@email.com",
    subjek: "Proposal kegiatan bakti sosial",
    pesan:
      "Kami dari komunitas peduli lingkungan ingin mengajukan proposal kegiatan bakti sosial pembersihan pantai. Bagaimana prosedurnya?",
    tanggal: "24/04/24 16:45",
    status: "Sudah Dibalas",
    prioritas: "Normal",
    kategori: "Kegiatan",
  },
  {
    id: 4,
    pengirim: "Maya Sari",
    email: "maya.sari@email.com",
    subjek: "Verifikasi donasi campaign",
    pesan:
      "Campaign donasi saya sudah berjalan 2 minggu tapi status masih pending. Kapan akan diverifikasi? Terima kasih.",
    tanggal: "24/04/24 14:20",
    status: "Perlu Tindak Lanjut",
    prioritas: "Tinggi",
    kategori: "Donasi",
  },
  {
    id: 5,
    pengirim: "Eko Prasetyo",
    email: "eko.prasetyo@email.com",
    subjek: "Saran perbaikan sistem",
    pesan:
      "Saya ingin memberikan saran untuk perbaikan fitur pencarian di website. Mungkin bisa ditambahkan filter berdasarkan lokasi.",
    tanggal: "23/04/24 11:30",
    status: "Sudah Dibaca",
    prioritas: "Rendah",
    kategori: "Saran",
  },
  {
    id: 6,
    pengirim: "Rina Wati",
    email: "rina.wati@email.com",
    subjek: "Laporan bug pada form pendaftaran",
    pesan:
      "Ada error saat mengisi form pendaftaran akun baru. Muncul pesan 'Server Error 500' ketika klik submit. Mohon diperbaiki.",
    tanggal: "23/04/24 08:45",
    status: "Perlu Tindak Lanjut",
    prioritas: "Tinggi",
    kategori: "Bug Report",
  },
];

export function PesanTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");

  const getStatusBadge = (status) => {
    switch (status) {
      case "Belum Dibaca":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <Mail className="w-3 h-3 mr-1" />
            Belum Dibaca
          </Badge>
        );
      case "Sudah Dibaca":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <MailOpen className="w-3 h-3 mr-1" />
            Sudah Dibaca
          </Badge>
        );
      case "Sudah Dibalas":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Reply className="w-3 h-3 mr-1" />
            Sudah Dibalas
          </Badge>
        );
      case "Perlu Tindak Lanjut":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <Clock className="w-3 h-3 mr-1" />
            Perlu Tindak Lanjut
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPrioritasBadge = (prioritas) => {
    switch (prioritas) {
      case "Tinggi":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Tinggi
          </Badge>
        );
      case "Normal":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Normal
          </Badge>
        );
      case "Rendah":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Rendah
          </Badge>
        );
      default:
        return <Badge variant="secondary">{prioritas}</Badge>;
    }
  };

  const getKategoriBadge = (kategori) => {
    const colors = {
      Komunitas: "bg-purple-100 text-purple-800",
      Teknis: "bg-blue-100 text-blue-800",
      Kegiatan: "bg-green-100 text-green-800",
      Donasi: "bg-orange-100 text-orange-800",
      Saran: "bg-indigo-100 text-indigo-800",
      "Bug Report": "bg-red-100 text-red-800",
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

  const filteredData = pesanData.filter(
    (item) =>
      item.pengirim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subjek.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReply = () => {
    // Handle reply logic here
    console.log("Reply sent:", replyText);
    setReplyText("");
    setSelectedMessage(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari pesan, pengirim, atau email..."
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
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengirim</TableHead>
              <TableHead>Subjek</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow
                key={item.id}
                className={item.status === "Belum Dibaca" ? "bg-blue-50" : ""}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{item.pengirim}</div>
                    <div className="text-sm text-gray-500">{item.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <div className="font-medium truncate">{item.subjek}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {item.pesan}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getKategoriBadge(item.kategori)}</TableCell>
                <TableCell>{getPrioritasBadge(item.prioritas)}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {item.tanggal}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMessage(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detail Pesan</DialogTitle>
                        </DialogHeader>
                        {selectedMessage && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">
                                  Pengirim
                                </label>
                                <p className="text-sm text-gray-900">
                                  {selectedMessage.pengirim}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">
                                  Email
                                </label>
                                <p className="text-sm text-gray-900">
                                  {selectedMessage.email}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">
                                  Kategori
                                </label>
                                <div className="mt-1">
                                  {getKategoriBadge(selectedMessage.kategori)}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">
                                  Prioritas
                                </label>
                                <div className="mt-1">
                                  {getPrioritasBadge(selectedMessage.prioritas)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Subjek
                              </label>
                              <p className="text-sm text-gray-900 mt-1">
                                {selectedMessage.subjek}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Pesan
                              </label>
                              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-900">
                                  {selectedMessage.pesan}
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">
                                Balas Pesan
                              </label>
                              <Textarea
                                placeholder="Tulis balasan Anda..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="mt-1"
                                rows={4}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedMessage(null)}
                              >
                                Batal
                              </Button>
                              <Button onClick={handleReply}>
                                <Reply className="w-4 h-4 mr-2" />
                                Kirim Balasan
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Reply className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Reply className="w-4 h-4 mr-2" />
                          Balas Pesan
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          Arsipkan
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" />
                          Tandai Belum Dibaca
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
