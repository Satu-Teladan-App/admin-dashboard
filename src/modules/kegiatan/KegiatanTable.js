"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
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

const komunitasData = [
  {
    id: 1,
    nama: "Komunitas Pemuda Kreatif",
    kategori: "Seni & Budaya",
    anggota: 245,
    status: "Aktif",
    tanggal: "15/03/24",
    kelengkapanData: "Validated",
  },
  {
    id: 2,
    nama: "Relawan Lingkungan Hijau",
    kategori: "Lingkungan",
    anggota: 189,
    status: "Aktif",
    tanggal: "22/02/24",
    kelengkapanData: "Validated",
  },
  {
    id: 3,
    nama: "Komunitas Teknologi Digital",
    kategori: "Teknologi",
    anggota: 567,
    status: "Pending",
    tanggal: "08/04/24",
    kelengkapanData: "Review",
  },
  {
    id: 4,
    nama: "Gerakan Literasi Masyarakat",
    kategori: "Pendidikan",
    anggota: 123,
    status: "Aktif",
    tanggal: "12/01/24",
    kelengkapanData: "Validated",
  },
];

export function KegiatanTable() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status) => {
    switch (status) {
      case "Aktif":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Aktif
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pending
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

  const filteredData = komunitasData.filter((item) =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari komunitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
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
              <TableHead>Nama Komunitas</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Anggota</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kelengkapan Data</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nama}</TableCell>
                <TableCell>{item.kategori}</TableCell>
                <TableCell>{item.anggota}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>{item.tanggal}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{item.kelengkapanData}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
