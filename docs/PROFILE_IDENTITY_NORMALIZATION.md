# Pemisahan status profil dan tahun lulus

Implementasi lokal pada `dev`, 12 November 2026. Migration 007 belum diterapkan. Tidak ada commit, push, deployment atau perubahan data live pada pengerjaan ini.

## Kontrak akhir

- `batch_status`: `alumni`, `aktif`, `guru`. Ini hubungan dengan sekolah, bukan role admin atau status verifikasi.
- `graduation_year`: tahun lulus alumni / perkiraan tahun lulus siswa. Guru tidak wajib memberikan tahun; tahun historis guru yang sudah tersimpan tidak dihapus otomatis.
- `batch`: kompatibilitas untuk client lama. Client baru tidak menulis kolom ini. Trigger migration 007 membuat ulang teks dari kolom terpisah; tulisan legacy berupa `batch` saja diterjemahkan ke kolom terpisah.
- Label dibentuk saat render: `Alumni · Lulus 2006`, `Siswa aktif · Perkiraan lulus 2028`, `Guru`.
- Tahun masuk tidak dikumpulkan dan tidak disimpulkan dari tahun lulus. Tahun tunggal dalam batch lama tidak dianggap otomatis sebagai tahun lulus.
- Tahun empat digit, paling awal 1900, batas atas umum tahun WIB berjalan + 12 (mempertahankan batas lama). Alumni tidak boleh memiliki tahun masa depan; siswa tidak boleh memiliki perkiraan sebelum tahun berjalan. Tidak ada promosi status siswa menjadi alumni otomatis ketika tahun berlalu.

## Perubahan kode

Mobile: onboarding dan edit profil menulis kolom terpisah; Guru tidak mendapat input tahun baru; preview label jelas. Profil, cache, detail, home, direktori, peta, kontak/chat, daftar blokir, pemilih alumni, detail berita, penulis/pembuat kegiatan dan komunitas memakai formatter yang sama. Filter tahun memakai parser ketat. Kelengkapan biodata tidak lagi mensyaratkan batch gabungan. Helper penyimpanan lama juga menulis kolom terpisah, menjaga full_name saat hanya nama panggilan dikirim; koordinat nol tidak diubah menjadi null dan upsert users tidak lagi mengirim updated_at yang tidak ada di DDL.

Admin: label pembuat/pengirim/penerima, kontribusi, direktori/detail alumni, pencarian dan perhitungan kelengkapan memakai status/tahun, tanpa prefiks ganda Batch/Angkatan. Guru tidak dinilai kurang lengkap karena tidak memiliki tahun lulus.

Support: navbar, profil API dan identitas pemilik tiket memakai kontrak yang sama. Query alumni menyertakan kolom terpisah. Types alumni/alumni_private diperbarui hanya untuk batch_status yang memang ada pada DDL pengguna; ini bukan hasil regenerasi metadata live.

Ketiga repo memiliki salinan helper murni `profileIdentity.js` karena deployment independen; tes memeriksa kesamaan isi. Jangan mengubah satu salinan saja.

Ranking: RPC baru `get_profile_contribution_rankings` mengembalikan status/tahun terpisah. RPC lama tidak diubah/dihapus. Client mencoba RPC baru dan fallback hanya ketika endpoint belum tersedia (`PGRST202`); kegagalan izin/network tidak disamarkan sebagai fallback. Ranking Energi dan Koin tetap terpisah, consent dan pengecekan pasangan akun/profil tetap berlaku.

## Migrasi data dan kompatibilitas

`007_profile_identity.sql` berdiri sendiri untuk profil dan RPC ranking; tidak mengharuskan menjalankan 004/005/006 sekaligus. Mengasumsikan tabel/kolom pada DDL pengguna tersedia, termasuk alumni_private, scoreboard, users dan Auth.

Preflight pengguna mengonfirmasi RLS aktif pada kedua tabel dan trigger `trg_sync_batch_status` memanggil `public.sync_batch_status()`. Body yang diberikan hanya menyalin prefiks batch ke batch_status. Migration kini memeriksa binding/type/body trigger terhadap versi yang telah ditinjau, lalu mengganti dua trigger lama dengan sync_profile_identity dalam transaksi yang sama. Function sync_batch_status lama tetap ada agar referensi lain tidak terputus. Jika trigger lama berubah atau menggunakan fungsi lain, migration berhenti; rollback memulihkan trigger yang sempat dihapus. Perbandingan body mengabaikan whitespace dan komentar baris. Tidak ada penonaktifan RLS atau perubahan grant tabel profil pada 007.

Backfill berlaku pada alumni dan alumni_private secara terpisah. Hanya isi yang tidak ambigu dan konsisten yang dinormalisasi, contohnya Alumni - 2006. Status/tahun yang bertentangan, tahun tunggal, format tidak dikenal, alumni masa depan dan siswa yang statusnya kedaluwarsa tidak ditebak/dihapus. Review tersedia melalui view `profile_identity_review`, hanya untuk service_role/owner, berisi nama tabel, ID record dan alasan. View ini menggunakan hak owner; jangan memberi SELECT kepada client.

Trigger tidak menghalangi edit kolom lain pada profil historis yang belum selesai direview. Perubahan identitas baru harus valid. Client lama dengan input identitas valid tetap didukung; input yang sebelumnya lolos tetapi melanggar validasi baru akan ditolak. Jika ada trigger sinkronisasi alumni↔alumni_private, urutan dan efeknya perlu diperiksa pada database aktual sebelum apply. Migration tidak mengimplementasikan atau menjamin sinkronisasi privasi dua tabel itu.

## Langkah penerapan

1. Jalankan SELECT pada `supabase/operations/profile-identity-preflight.sql` satu per satu di SQL Editor agar semua hasil terlihat. Query hanya membaca metadata. Periksa kolom, trigger, policy/grants serta benturan nama function/view. Body sync_batch_status yang diberikan pengguna sudah direview; guard migration memeriksa kesesuaiannya kembali saat apply.
2. Siapkan backup/restore point database aktif dan review interaksi trigger aktual. Jangan memakai DDL konteks pengguna sebagai migration.
3. Tinjau lalu jalankan hanya 007 satu kali dari BEGIN sampai COMMIT. Script tidak idempotent; jangan ulang jika object sudah ada. Jangan menjalankan seluruh folder dengan db push.
4. Sebagai owner, lihat ringkasan `SELECT source_table,reason,count(*) FROM public.profile_identity_review GROUP BY source_table,reason;`. Perbaiki kasus ambigu melalui sumber data yang dapat dikonfirmasi; jangan menyimpulkan angkatan masuk/lulus dari angka saja.
5. Uji registrasi Alumni, Siswa aktif dan Guru; edit tahun/status; cache setelah edit; pencarian nama/status/tahun; periksa data menggunakan kolom terpisah. Uji client lama menulis batch saja dan memastikan trigger menjaga ketiga kolom konsisten.
6. Uji ranking dengan dua metrik, nilai seri dan consent; verifikasi private profile dan review view tidak dapat dibaca akun lain.
7. Terapkan kode melalui alur rilis yang dipilih pengguna. Perubahan ini JavaScript/SQL, tanpa tambahan modul native. Build EAS yang sudah terupload tidak otomatis menyertakan perubahan ini; development client dapat memuat JavaScript baru melalui Metro.
8. Hapus batch hanya setelah inventaris consumer/version aplikasi lama menunjukkan kolom tidak dipakai lagi. Belum ada migration DROP COLUMN.

## Pengujian lokal

Frontend: `npm run test:identity`, `npm run test:product`, `npm run test:push`, `npx tsc --noEmit`.

Support: `npm run test:identity-db` dengan `PRODUCT_DB_TEST_MODULE` menunjuk PGlite 0.5.15 jika belum tersedia di dependency. Tes database bersifat fixture PostgreSQL terisolasi; tidak menghubungi Supabase aktif. Jalankan juga tes produk/push yang sudah ada dan build kedua web.

Snapshot historis: 102 pemeriksaan identitas lokal lulus. Tes push database memuat migration006 dan007 bersama. Hasil ini bukan metadata live atau pengujian seluruh perangkat.

Setelah penyesuaian trigger live: 11 pemeriksaan DB identitas dan 20 pemeriksaan DB push lolos pada fixture, termasuk penggantian trigger lama, normalisasi client lama/baru, dan rollback kedua tabel jika body atau binding lama tidak sesuai. Bukti: audit/results/profile-identity-legacy-trigger-checks.json, audit/logs/profile-identity-legacy-trigger-checks.log dan audit/logs/profile-identity-legacy-push-checks.log. Hasil ini belum merupakan apply atau pengujian migration pada database aktif.

Browser dan perangkat sungguhan tetap perlu menguji wrapping label panjang, pergantian status/input tahun, refresh cache dan data historis aktual. Jangan menyamakan tes fixture dengan verifikasi database production.

## Pemeriksaan pola serupa di seluruh workspace

| Area | Bukti / persoalan | Penanganan |
| --- | --- | --- |
| Identitas profil | batch menyalin status+tahun; prefiks Batch/Angkatan ganda; guru dianggap siswa; pencarian/gate bergantung label | Diimplementasikan pada kode dev + 007; live belum diterapkan |
| ID akun dan profil | auth.users.id, users.id, alumni.id berbeda; messages memiliki sender Auth dan sender_alumni_id | Pemetaan laporan sudah dibenahi pada batch sebelumnya. Push memakai Auth ID. Duplikasi identitas perlu audit konsistensi aktual; jangan menghapus FK/kolom legacy tanpa memeriksa consumer |
| Profil publik/private | alumni dan alumni_private memuat data serupa; consents dan JSON domisili/socials | Trigger sinkronisasi, masking, RLS dan read path live belum diverifikasi. Jangan menjadikan satu tabel sebagai view sebelum aturan privasi dipastikan |
| Pembayaran | donasi_transaction dan transactions; progress donasi vs ledger; float vs numeric | Sumber kebenaran dan webhook gateway belum terverifikasi. Pertahankan data, rancang rekonsiliasi/idempotensi sebelum konsolidasi. Tidak ditulis ulang pada pekerjaan identitas |
| Saldo kontribusi | scoreboard menyimpan aggregate, contribution menyimpan ledger | RPC atomik dan summary pada migration 004 masih pending; perlu verifikasi konsistensi akun/profil, saldo dan ledger aktual. Aggregate boleh disimpan jika dikelola transaksi server |
| Notifikasi | notification, notifications dan tabel baru 006 | Tabel lama masih dipertahankan; kontrak push baru jelas. Riwayat/retensi dan perpindahan consumer perlu keputusan terpisah |
| Lokasi | latitude/longitude, domisili JSON dan country/region/city/kecamatan | Duplikasi representasi harus dipetakan ke input dan penggunaan aktual. Jangan mengisi koordinat palsu. Null/0 pada helper save diperbaiki; mapper alternatif alumniDataService juga tidak lagi memberi koordinat sekolah untuk lokasi kosong; sinkronisasi lokasi/privasi menyeluruh belum selesai |
| Role/verifikasi | batch_status, alumni_verification, admin_roles dan permissions | Ketiganya punya makna berbeda. Status alumni/guru tidak boleh memberi hak admin atau mengklaim akun terverifikasi |
| Relasi keanggotaan | komunitas_member, attendance dan user_blocks belum menampilkan unique pasangan pada DDL | Profiling duplikasi dan definisi index live masih diperlukan sebelum menambahkan unique; jangan membersihkan record secara otomatis |
| reports | beberapa FK target nullable | Perlu kontrak per jenis laporan dan CHECK target yang cocok dengan data aktual; schema saja belum membuktikan row invalid |
| Helper profil lama | public.users di DDL tidak memiliki username/full_name/avatar_url/updated_at, tetapi helper legacy updateUserProfile memakai sebagian field tersebut | updated_at pada upsert identity dibuang. updateUserProfile legacy dan pemanggilnya perlu konsolidasi terpisah; jangan memperluas users hanya untuk menyesuaikan helper yang tidak terpakai |
| Kredit tim statis | Tentang.jsx memakai batch pada daftar orang hardcoded | Bukan data profil database. Makna tahun tidak dikonfirmasi, sehingga tidak dilabel ulang sebagai tahun lulus |

Pemeriksaan ini adalah inventaris source/DDL, bukan audit isi seluruh record atau jaminan semua masalah data sudah selesai. Prioritas berikutnya: verifikasi metadata live/privasi → konsistensi identitas dan relasi → rekonsiliasi ledger/pembayaran → penghentian kolom legacy.
