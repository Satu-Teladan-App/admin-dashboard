# 📘 Panduan Lengkap Operasional Administrator - Satu Teladan
*(Dilengkapi dengan Panduan Dokumentasi Visual & Screenshot)*

Dokumen ini dirancang untuk memandu tugas harian administrator dalam mengelola database alumni, menyetujui kegiatan/komunitas, merilis program donasi, mempublikasikan berita, membalas tiket keluhan, dan mengamankan sistem.

---

## 📋 Daftar Isi
1. [Manajemen Akses & Ringkasan Harian (Overview)](#1-manajemen-akses--ringkasan-harian-overview)
2. [Alur Verifikasi Alumni Baru](#2-alur-verifikasi-alumni-baru)
3. [Moderasi Komunitas & Kegiatan Alumni](#3-moderasi-komunitas--kegiatan-alumni)
4. [Manajemen Kampanye Donasi (Pendanaan)](#4-manajemen-kampanye-donasi-pendanaan)
5. [Publikasi & Pengelolaan Berita](#5-publikasi--pengelolaan-berita)
6. [Penyelesaian Tiket Keluhan Pengguna (Support Tickets)](#6-penyelesaian-tiket-keluhan-pengguna-support-tickets)
7. [Penegakan Sanksi & Fitur Blacklist](#7-penegakan-sanksi--fitur-blacklist)
8. [Pengaturan Tingkat Akses (Roles & Permissions)](#8-pengaturan-tingkat-akses-roles--permissions)
9. [Panduan Teknis Memasukkan Gambar ke Markdown](#9-panduan-teknis-memasukkan-gambar-ke-markdown)

---

## 1. Manajemen Akses & Ringkasan Harian (Overview)

### A. Alur Masuk Ke Aplikasi (Sign In)
1. Buka browser Anda dan akses URL dashboard (misal: `http://localhost:3000` atau alamat domain hosting resmi).
2. Masukkan **Email** dan **Password** admin Anda.
3. Klik tombol **Sign In** untuk masuk.

```
📸 AREA SCREENSHOT 1: Halaman Login (Sign-In)
[File: /public/docs/signin/login_page.png]
Panduan Mengambil Screenshot:
- Tangkap layar penuh halaman masuk (Sign In).
- Berikan kotak merah pada kolom input email, password, dan tombol masuk.
```

---

### B. Membaca Dashboard Utama (Overview)
Setelah login berhasil, Anda berada di beranda **Overview**.
1. **Kartu Statistik**: Menampilkan rangkuman jumlah Alumni, Kegiatan, Total Donasi Terkumpul, Berita Aktif, dan Komunitas Terdaftar.
2. **Grafik Tren**: Visualisasi tren perkembangan aktivitas selama 6 bulan terakhir.
3. **Pending Verifications**: Daftar antrean pendaftaran/konten baru yang menunggu persetujuan Anda.

```
📸 AREA SCREENSHOT 2: Dashboard Overview & Statistik
[File: /public/docs/overview/dashboard_main.png]
Panduan Mengambil Screenshot:
- Tangkap area atas berisi kartu statistik dan grafik aktivitas.
- Beri kotak merah pada tab seleksi di atas grafik (Alumni, Kegiatan, dll.) yang digunakan untuk menyaring data tren.
```

```
📸 AREA SCREENSHOT 3: Widget Antrean Verifikasi (Pending Verifications)
[File: /public/docs/overview/pending_verifications.png]
Panduan Mengambil Screenshot:
- Tangkap area widget "Pending Verifications" di bagian bawah halaman.
- Beri lingkaran merah pada tombol "Centang Hijau" (untuk verifikasi instan) dan tombol "Mata" (untuk melihat detail).
```

---

## 2. Alur Verifikasi Alumni Baru

Proses ini sangat penting untuk memastikan hanya alumni nyata dari SMA/sekolah bersangkutan yang mendapatkan akses penuh ke dalam aplikasi mobile.

### Langkah-Langkah Operasional:
1. Klik menu **Alumni** di sidebar sebelah kiri.
2. Saring daftar menggunakan filter dropdown **Unverified** untuk memunculkan pendaftar baru yang belum divalidasi.
3. Klik tombol **Detail (ikon Mata)** pada baris nama alumni yang akan ditinjau.
4. Periksa kecocokan data Angkatan, Nomor Telepon, Domisili, dan Media Sosial.
5. Jika data valid, klik **Verify Member** di kanan bawah modal detail. Jika mencurigakan, lakukan penangguhan.

```
📸 AREA SCREENSHOT 4: Tabel Pengelolaan Alumni
[File: /public/docs/alumni/alumni_list.png]
Panduan Mengambil Screenshot:
- Tangkap tabel alumni. Beri kotak merah pada kolom pencarian ("Search alumni...") dan dropdown status filter di pojok kanan atas tabel.
```

```
📸 AREA SCREENSHOT 5: Modal Detail & Verifikasi Alumni
[File: /public/docs/alumni/alumni_detail_modal.png]
Panduan Mengambil Screenshot:
- Buka detail alumni. Tangkap jendela pop-up modal informasi alumni.
- Lingkari merah bagian informasi angkatan kelulusan serta tombol "Verify Member".
```

---

## 3. Moderasi Komunitas & Kegiatan Alumni

Alumni terverifikasi dapat membuat kelompok komunitas regional atau hobi, serta mempublikasikan kegiatan. Admin bertugas menyaring kelayakan konten tersebut agar tidak melanggar aturan hukum dan etika.

### A. Verifikasi Komunitas Baru
1. Buka menu **Komunitas** di sidebar.
2. Cari komunitas dengan badge oranye bertuliskan **Unverified**.
3. Klik tombol detail, lalu periksa nama komunitas, deskripsi, serta keaktifan tautan WhatsApp Group/Instagram.
4. Klik **Approve/Verify** jika dinilai layak dan aman.

```
📸 AREA SCREENSHOT 6: Verifikasi Halaman Komunitas
[File: /public/docs/komunitas/komunitas_table.png]
Panduan Mengambil Screenshot:
- Tangkap tabel daftar komunitas. Beri kotak merah pada status badge "Unverified" komunitas baru dan tombol verifikasi.
```

---

### B. Verifikasi Kegiatan (Event)
1. Buka menu **Kegiatan** di sidebar.
2. Periksa detail kegiatan: deskripsi acara, tanggal pelaksanaan, lokasi (alamat/koordinat peta), kuota, dan penyelenggara.
3. Klik tombol **Verify Event** untuk mempublikasikan acara tersebut ke aplikasi mobile.

```
📸 AREA SCREENSHOT 7: Verifikasi Kegiatan Baru
[File: /public/docs/kegiatan/event_verification.png]
Panduan Mengambil Screenshot:
- Buka detail kegiatan yang ditangguhkan. Tangkap layar pop-up detail kegiatan.
- Sorot tanggal kegiatan, lokasi peta, dan tombol persetujuan verifikasi menggunakan lingkaran merah.
```

---

## 4. Manajemen Kampanye Donasi (Pendanaan)

Fitur ini melayani penggalangan dana sosial lintas alumni (misalnya beasiswa atau donasi sosial).

### A. Membuat Kampanye Donasi Baru
1. Buka menu **Pendanaan** di sidebar.
2. Klik tombol **Add Campaign** di pojok kanan atas.
3. Isi kolom formulir:
   - Nama Penggalangan Dana, Nama Penyelenggara, dan Nominal Target Dana.
   - Deskripsi lengkap tujuan penggalangan dana.
   - Tautan dokumen proposal PDF dan tautan gambar promosi.
   - Informasi bank rekening penerima donasi (dalam format JSON pada field Payment Info).
4. Klik **Save Campaign**.

```
📸 AREA SCREENSHOT 8: Tombol & Formulir Tambah Donasi
[File: /public/docs/donasi/add_donation_form.png]
Panduan Mengambil Screenshot:
- Tampilkan formulir pop-up pengisian donasi baru yang terisi sebagian.
- Lingkari merah kolom input penting seperti "Target Amount", "Proposal URL", dan tombol simpan.
```

---

### B. Memantau Perkembangan Donasi
- Pada tabel donasi, Anda dapat melacak kolom **Progress** yang menunjukkan persentase dana terkumpul secara real-time dari verifikasi transaksi yang masuk.

```
📸 AREA SCREENSHOT 9: Status Progress Donasi
[File: /public/docs/donasi/donation_progress.png]
Panduan Mengambil Screenshot:
- Tangkap tabel daftar kampanye donasi aktif.
- Berikan kotak merah pada kolom persentase progress dan jumlah nominal yang terkumpul.
```

---

## 5. Publikasi & Pengelolaan Berita

Fitur ini digunakan oleh admin untuk membagikan info resmi sekolah, agenda nasional, atau kabar prestasi alumni.

### A. Menerbitkan Berita Baru
1. Buka menu **Berita** di sidebar.
2. Klik tombol **Add Article** di kanan atas halaman.
3. Isi Judul berita, Kategori, Tanggal Publikasi, URL Gambar Sampul, URL Artikel Lengkap (jika ada), dan Teks Deskripsi.
4. Klik **Publish Article**.

```
📸 AREA SCREENSHOT 10: Formulir Tambah Berita Baru
[File: /public/docs/berita/add_berita_form.png]
Panduan Mengambil Screenshot:
- Tampilkan form tambah berita yang terbuka.
- Beri tanda anak panah merah pada kolom Kategori (Select box) dan tombol "Publish Article".
```

---

### B. Mengubah atau Menghapus Berita
1. Untuk mengedit berita yang salah ketik, klik tombol **Edit (ikon Pensil)** pada baris berita terkait, ubah teks, lalu klik **Save Changes**.
2. Untuk menghapus berita, klik tombol **Delete (ikon Tempat Sampah)** pada baris berita yang dituju.

```
📸 AREA SCREENSHOT 11: Aksi Edit & Hapus Berita
[File: /public/docs/berita/edit_delete_actions.png]
Panduan Mengambil Screenshot:
- Tangkap baris tabel berita. Lingkari merah tombol aksi pensil (edit) dan tempat sampah (delete) pada kolom paling kanan.
```

---

## 6. Penyelesaian Tiket Keluhan Pengguna (Support Tickets)

Melayani kendala teknis yang dihadapi alumni saat menggunakan aplikasi mobile.

### Langkah-Langkah Operasional:
1. Buka menu **Tickets** di sidebar.
2. Klik tiket keluhan yang berstatus **Open** (warna merah).
3. Baca isi kendala yang dilaporkan oleh pengguna.
4. Lakukan penanganan secara sistem (misalnya mengubah data eror di database).
5. Pada form tindak lanjut tiket:
   - Tulis langkah solusi yang Anda ambil di kolom **Admin Notes**.
   - Ubah dropdown status tiket menjadi **Resolved**.
6. Klik **Update Ticket**.

```
📸 AREA SCREENSHOT 12: Daftar Tiket Dukungan (Support Tickets)
[File: /public/docs/tickets/tickets_list_open.png]
Panduan Mengambil Screenshot:
- Tangkap daftar tiket keluhan. Beri tanda lingkaran merah pada filter status "Open" dan kolom prioritas tiket.
```

```
📸 AREA SCREENSHOT 13: Jendela Penyelesaian Tiket
[File: /public/docs/tickets/resolve_ticket_detail.png]
Panduan Mengambil Screenshot:
- Tangkap area pengisian resolusi tiket.
- Berikan kotak merah pada kolom input "Admin Notes", pilihan status "Resolved", dan tombol "Update Ticket".
```

---

## 7. Penegakan Sanksi & Fitur Blacklist

Jika terdapat alumni terverifikasi yang melanggar aturan komunikasi komunitas, admin dapat memblokir akses fitur spesifik milik pengguna tersebut tanpa menghapus akunnya sepenuhnya.

### Langkah-Langkah Operasional:
1. Buka halaman **Alumni** atau **Berita**.
2. Klik tombol **Menu (ikon Titik Tiga)** pada baris data pengguna yang melanggar.
3. Pilih menu **Blacklist**.
4. Di pop-up yang muncul:
   - Tentukan fitur yang akan diblokir (Contoh: memblokir akses menulis berita/berita, berkirim pesan/messages, donasi, atau diblokir dari semua fitur).
   - Isi alasan pemblokiran pada kolom **Reason** secara jelas.
5. Klik **Blacklist User**.
6. Masuk ke menu **Blacklists** di sidebar untuk meninjau status daftar hitam yang aktif.

```
📸 AREA SCREENSHOT 14: Form Pengisian Blacklist User
[File: /public/docs/blacklist/blacklist_form_open.png]
Panduan Mengambil Screenshot:
- Tampilkan pop-up dialog blacklist alumni.
- Lingkari merah opsi pilihan jenis pemblokiran fitur dan kolom pengisian "Reason".
```

```
📸 AREA SCREENSHOT 15: Daftar Hitam (Blacklists) Aktif
[File: /public/docs/blacklist/blacklists_active_table.png]
Panduan Mengambil Screenshot:
- Tangkap tabel di halaman Blacklists.
- Kotaki merah baris data pengguna yang diblokir, pembuat pemblokiran (admin), dan tombol "Delete/Remove" untuk membuka blokir kembali.
```

---

## 8. Pengaturan Tingkat Akses (Roles & Permissions)

Melakukan delegasi tugas ke admin lain dengan tingkat kewenangan yang berbeda (misalnya Super Admin vs Moderator Konten).

### A. Menambahkan Admin Baru
1. Buka menu **Manage** di bawah kategori *Admin* pada sidebar.
2. Klik tombol **Add Admin** di pojok kanan atas.
3. Ketik nama alumni yang akan ditunjuk pada kolom pencarian, lalu pilih.
4. Tentukan peran admin (*Role*) yang sesuai untuk mereka.
5. Klik **Assign Role**.

```
📸 AREA SCREENSHOT 16: Form Penambahan Admin Baru
[File: /public/docs/admin/add_admin_dialog.png]
Panduan Mengambil Screenshot:
- Tangkap dialog tambah admin yang terbuka.
- Lingkari merah bagian dropdown pemilihan "Role" dan tombol "Assign Role".
```

---

### B. Mengatur Izin Hak Akses Peran (Roles & Permissions)
1. Buka menu **Roles & Permissions** di sidebar.
2. Anda akan melihat nama peran beserta penanggung jawabnya.
3. Untuk mengubah izin dari suatu peran, klik tombol edit di baris terkait.
4. Centang atau kosongkan izin khusus (misal: mencentang `manage_berita` saja untuk membatasi admin tersebut agar tidak dapat masuk ke menu setelan admin/roles).
5. Klik **Save Permissions**.

```
📸 AREA SCREENSHOT 17: Pengaturan Hak Akses Permissions
[File: /public/docs/admin/role_permissions_grid.png]
Panduan Mengambil Screenshot:
- Tangkap tabel pengaturan otorisasi peran.
- Berikan kotak merah pada kotak centang (checkbox) daftar izin (`manage_roles`, `manage_berita`, dll.) dan tombol simpan.
```

---

## 9. Panduan Teknis Memasukkan Gambar ke Markdown

Setelah Anda selesai mengambil semua screenshot di atas dan menandai bagian penting dengan lingkaran/kotak merah:

1. Ubah nama file screenshot Anda agar sesuai dengan nama file di bawah kotak panduan screenshot (contoh: ubah nama file tangkapan layar alumni menjadi `alumni_table.png`).
2. Masukkan file gambar tersebut ke dalam folder publik proyek Anda di:
   `public/docs/alumni/`, `public/docs/berita/`, dst.
3. Di dalam editor Markdown, cari kotak placeholder `📸 TEMPATKAN SCREENSHOT DI SINI`.
4. Ganti baris teks kotak placeholder tersebut dengan sintaks pemanggilan gambar Markdown.

**Contoh Perubahan Dokumen:**

*Sebelum dimasukkan gambar (masih placeholder):*
```markdown
#### Langkah 1: Masuk Halaman Alumni & Cari Anggota
- Buka sidebar sebelah kiri, klik menu **Alumni**.

📸 TEMPATKAN SCREENSHOT DI SINI:
[File: /public/docs/alumni/alumni_table.png]
Panduan Screenshot: Tunjukkan tabel alumni keseluruhan, beri kotak merah pada kolom "Search alumni" dan tombol "Detail".
```

*Setelah dimasukkan gambar (siap dipublikasikan):*
```markdown
#### Langkah 1: Masuk Halaman Alumni & Cari Anggota
- Buka sidebar sebelah kiri, klik menu **Alumni**.

![Halaman Utama Pengelolaan Alumni](/docs/alumni/alumni_table.png)
```
