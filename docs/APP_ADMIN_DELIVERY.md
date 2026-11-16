# Aplikasi, chat admin, dan dashboard

Pembaruan 12 November 2026. Implementasi lokal pada branch `dev`; bukan deployment production.

## Alur yang disiapkan

Di aplikasi, Pesan memuat satu percakapan tetap **Admin Satu Teladan** dengan logo. Pengguna membuka bubble tersebut atau Hubungi Kami untuk mengirim pesan. Pengiriman pertama membuat tiket; pengiriman berikutnya memakai percakapan yang sama. Riwayat tiket lama tetap tersedia. Akun belum terverifikasi dapat menghubungi admin tanpa membuka akses DM antaralumni.

Admin menangani percakapan melalui `/tickets`: membaca, membalas, memilih status/prioritas, dan menyimpan catatan internal. Catatan internal berada di tabel terpisah yang tidak dapat dibaca pengguna biasa. Status baca chat menyelaraskan unread inbox; balasan admin memakai trigger notifikasi yang sudah tersedia. Realtime dipakai jika publication tersedia, dengan polling sebagai fallback. Header dashboard menampilkan jumlah percakapan yang menunggu admin, bukan klaim jumlah pesan belum dibaca.

## Perubahan dashboard lain

- Izin halaman dan aksi server memakai pemetaan nama canonical ke permission yang sudah ada: `manage_users` → `alumni:manage`, `manage_roles` → `admin:manage`, dan pemetaan domain lain. Nama permission lama tidak diganti. `manage_support` diberikan pada role pengelola user/admin/pesan yang sudah ada; `view_analytics` pada role pengelola domain yang sebelumnya sudah ada.
- Menu sidebar dijadikan client component agar tautan tidak hilang akibat hydration mismatch. Layout admin menyesuaikan layar sempit.
- Berita: tambah memakai kolom `writer` dan profil penulis yang sesuai; Edit yang sebelumnya tidak mempunyai handler sekarang tersimpan; publish memakai tanggal WIB; operasi memeriksa row yang benar-benar berubah.
- Berita/kegiatan/komunitas/kampanye/tantangan/pesan memakai **Arsipkan**, bukan DELETE parent yang gagal karena FK. Konten tidak lagi terlihat melalui query biasa, termasuk klien lama. Laporan, transaksi, membership dan riwayat tetap ada. Pengarsipan kegiatan mematikan tantangannya; kampanye dengan pembayaran pending tidak dapat diarsipkan.
- Verifikasi alumni/kegiatan/komunitas/donasi memakai RPC yang mengunci parent dan mencegah duplikasi. Identitas pemeriksa berasal dari sesi. Relasi object maupun array dikenali.
- Pengubahan role dan permission atomik; penugasan admin mencabut hanya role yang dipilih; operasi yang menghilangkan akses pengelolaan pemanggil ditolak.
- Blacklist memeriksa izin domain dan affected rows; record tidak dapat dipindah ke akun/fitur lain. Tombol toggle tantangan juga memeriksa affected row.
- Kontribusi ditampilkan sebagai riwayat yang dipertahankan; tidak ada DELETE ledger yang membuat saldo semakin berbeda.
- Tindakan pada alumni membuat peninjauan penghapusan akun, bukan menghapus profil dan memutus semua FK. `/account-requests` mencatat persetujuan/penolakan dan alasan. **Persetujuan belum menghapus Auth user atau Storage.** Status completed tidak dapat ditetapkan lewat RPC peninjauan ini.

## Paket SQL

Gunakan **satu file**: [`supabase/operations/app-admin-install.sql`](../supabase/operations/app-admin-install.sql).

File dihasilkan dari migration 008–012 dengan satu BEGIN/COMMIT, lock timeout dan statement timeout. SHA-256 tiap sumber tercantum di dalamnya. Jika terjadi kegagalan, seluruh paket di-rollback. Jangan menjalankan paket gabungan lalu menjalankan file 008–012 lagi.

Generator dan pemeriksaan lokal, dari repo admin-dashboard:

```sh
npm run prepare:app-admin-sql
npm run test:app-admin
npm run build
```

Sebelum menerapkan ke database aktif:

1. Sediakan versi admin ini di local/dev dan cadangkan database terbaru. Backup lokal sebelum paket disiapkan pada 12 November 2026; lokasinya tercatat di memori workspace, bukan disalin ke Git.
2. Periksa metadata dengan [`app-admin-preflight.sql`](../supabase/operations/app-admin-preflight.sql). Ini hanya query read-only.
3. Siapkan perpindahan ke versi admin baru: paket membatasi write langsung tiket, verifikasi dan role sehingga admin versi lama perlu diperbarui. Jangan menerapkan perubahan backend lalu terus menggunakan handler dashboard lama untuk operasi tersebut.
4. Jalankan seluruh `app-admin-install.sql` **sekali** melalui SQL Editor pada project yang benar. Jangan memakai `db push` seluruh folder dan jangan menjalankan migration 004.
5. Jalankan admin versi baru dan aplikasi dev, kemudian uji satu percakapan milik akun pengujian: kirim dari aplikasi → baca/balas admin → kembali ke aplikasi → cek inbox/push dan tap notifikasi.

Tidak ada service-role key yang perlu dimasukkan ke browser atau aplikasi untuk alur ini.

**004 tetap ditahan.** Salinannya mendefinisikan ulang beberapa RPC statistik/consent; penerapan reward berikutnya perlu direbase terhadap paket ini agar filtering arsip dan kontrak izin tidak tertimpa. Paket baru tidak memasang reward RPC, tidak mencabut privilege reward, dan tidak mengubah saldo.

## Matriks verifikasi

| Area | Bukti yang ada | Batas |
| --- | --- | --- |
| Chat owner/admin, privasi catatan, idempotensi, read state | Tes database fixture dan helper service | Belum penerapan live |
| Balas, catatan, status dan refresh admin | Browser headless menjalankan source Next aktual dengan backend fixture lokal | Bukan sesi production |
| Sidebar, mobile admin 390px, izin ditolak | Browser fixture + screenshot, tanpa hydration/page error | Tidak menggantikan uji perangkat native |
| Berita create/edit/publish/arsip | Browser fixture memeriksa request dan hasil setelah refresh; arsip/FK diuji DB fixture | Belum menghapus/mengarsip konten pengguna nyata |
| Role/permission dan membership | Fixture DB membuktikan atomicity, izin dan pencegahan self-lockout | Belum uji semua role production di browser |
| Verifikasi domain, blacklist, account review | Fixture DB dan pembacaan handler | Eksekusi penghapusan Auth/Storage bukan fungsi halaman peninjauan |
| Keyboard, safe area, avatar, pemilih tahun, onboarding | Typecheck/regresi/export mobile | Perlu Android/iPhone untuk UX keyboard dan native splash |
| Remote push dan Realtime | Pipeline lama dipertahankan, fixture menguji trigger/idempotensi/read; polling fallback tersedia | Belum uji delivery lintas perangkat sesudah penerapan paket |

Tes browser terisolasi:

```sh
npx playwright install chromium
npm run test:admin-browser
```

Runner menyalin source admin ke folder sementara tanpa `.env`, menggunakan fake JWT/backend localhost, dan memblokir permintaan browser ke production. Ia tidak membuat atau menghapus tiket/konten pengguna sungguhan. `SATU_TEST_BROWSER_PATH` dapat menunjuk executable Chromium yang sudah tersedia.

Bukti workspace: `audit/results/app-admin-browser.json`, `audit/screens/app-admin/`, dan laporan verifikasi batch ini. Screenshot berisi data fixture.

## Batas rilis

Belum ada push Git, deployment, penerapan paket SQL atau cloud build. Perubahan launcher/adaptive icon dan konfigurasi native splash memerlukan binary baru; reload Metro tidak memperbaruinya. Android/iPhone tetap perlu menguji keyboard dan notifikasi background/closed. Jangan menyatakan perubahan telah aktif pada aplikasi store hanya karena build lokal berhasil.

## Ranking otomatis, pembaruan 15 November

Pengguna memilih semua anggota otomatis ikut dan meminta desain podium lama dipertahankan. Terapkan hanya `supabase/migrations/013_automatic_member_ranking.sql` setelah paket 008–012. Jangan jalankan ulang installer atau 004. Fungsi ranking kini menyertakan seluruh profil anggota aktif meski belum memiliki scoreboard; saldo kosong dibaca sebagai nol, tidak dibuatkan saldo baru. Nilai historis consents tidak ditulis ulang dan tidak lagi menyaring ranking. Endpoint tetap authenticated-only; akun deactivated dikecualikan. Energi/Koin terpisah dan nilai seri mendapat peringkat sama. Migration ini belum diterapkan oleh agent.

Verifikasi fixture: `node scripts/test-member-ranking-db.mjs`, delapan pemeriksaan lolos. Frontend: 38 regresi lolos, typecheck dan scoped lint lolos, export iOS lolos. Tampilan memakai AppBar/Avatar/Button/SegmentedControl bersama; podium 2–1–3, tabel dua skor dan footer peringkat sendiri. Tidak ada gate persetujuan. Data populated pada simulator perlu dicek sesudah SQL013 dijalankan; database lama masih menyaring consent.

## Perbaikan DM anggota dan tindak lanjut UI

Gunakan satu file **supabase/operations/member-ranking-chat-fix.sql** untuk013+014, bukan installer008–012 lagi. SQL ini disiapkan saja. Migration014 memperbaiki regresi guard011: akun yang mempunyai role admin lain tidak boleh dipaksa mempunyai izin moderasi untuk mengirim pesan pribadinya sendiri. Pengirim Auth/profil harus cocok; RLS verifikasi/blacklist tetap berlaku dan hak moderasi tidak diberikan ke anggota.

Pengguna menempatkan selector Energi/Koin tepat di atas navigasi bawah. Halaman Tentang memakai typography/settings rows/logo Tugu bersama. Bukti lokal61tes (43Front+18DB), typecheck/lint/export iOS; screenshot di audit/screens/member-ui. Data live agregat: tujuh scoreboard,total207Energi/0Koin, consenttrue0. Tidak ada reset atau perubahan saldo dari batch ini.
