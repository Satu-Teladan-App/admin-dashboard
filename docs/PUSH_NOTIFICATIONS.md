# Push notification Satu Teladan

Status scheduler 12 November 2026, 11:10 UTC (screenshot pengguna): request cron terbaru mendapat HTTP 200 tanpa timeout setelah secret Vault disamakan dengan secret worker. Sebelumnya cron melaporkan succeeded meski HTTP 401; nama secret dan URL benar, tetapi isi dispatch secret berbeda. Selalu periksa respons pg_net, bukan hanya status cron. Keberhasilan notifikasi bisnis sampai perangkat tetap perlu verifikasi terpisah.

Kode pada branch dev, pembaruan 12 November 2026. Pengguna telah deploy worker, mengisi secrets/Vault, membuat cron aktif dan menjalankan invoke manual yang menghasilkan receipt dari Expo. Pengguna mengonfirmasi banner lokal berhasil di POCO. Request scheduler terbaru berhasil HTTP200 setelah secret diperbaiki; remote delivery di perangkat belum terverifikasi. Fitur/script pengirim tes sementara sudah dihapus atas permintaan pengguna; satu event, recipient/delivery dan tiket sintetis otomatis dibersihkan live secara terbatas. Riwayat pengujian fixture ada di audit. Perubahan sebelumnya di dev dan AdminGuide.md milik pengguna dipertahankan.

## Alur dan cakupan

Perubahan bisnis → trigger database → notification_events + notification_recipients + push_deliveries dalam transaksi yang sama → scheduler → Edge Function push-dispatch → Expo → FCM/APNs. Inbox tidak bergantung keberhasilan push; izin push dapat ditolak tanpa menghilangkan inbox.

| Pemicu | Penerima | Tujuan |
| --- | --- | --- |
| INSERT alumni_verification oleh admin/service | Pemilik profil | Halaman status verifikasi |
| INSERT ticket_replies berlabel admin dan identitas admin valid | Pemilik tiket, kecuali pembalas sendiri | Portal support pada tiket terkait; return destination dipertahankan saat login |
| Publikasi berita oleh admin/service dengan publication_date sudah berlaku dalam WIB | Akun yang memilih berita | Detail berita |
| INSERT kegiatan_verification oleh admin/service | Pemilik membership komunitas yang tersimpan | Detail kegiatan |

MVP berita menggunakan publikasi langsung. Tanggal publikasi masa depan belum memiliki scheduler publikasi; jangan menganggap sekadar lewat tanggal akan membuat event. Ubah menjadi publikasi aktif melalui aksi admin yang sesuai. Pengeditan berita yang sudah diterbitkan tidak membuat push ulang. Verifikasi ulang profil yang sama juga tidak membuat event baru karena deduplikasi per profil. Ini aturan MVP yang dapat ditinjau bersama kebutuhan operasional.

Tabel notification dan notifications lama tidak dihapus, disalin atau dijadikan sumber baru secara diam-diam. Inbox baru menggunakan tabel dengan kontrak penerima Auth user ID. Riwayat lama belum dimigrasikan.

## Berkas

- `supabase/migrations/006_notifications.sql`: tabel, index, RLS, registrasi/release perangkat, preferensi, read state, pemicu dan claim queue.
- `supabase/functions/push-dispatch/`: worker serta implementasi send/receipt yang terpisah dan dapat diuji.
- `supabase/operations/schedule-push.sql`: operasi scheduler opsional, belum dijalankan.
- Frontend: notificationService, pushDeviceService, PushNotificationManager dan screen Notifikasi.
- Expo plugin, dependency SDK 54 dan EAS environment sudah disiapkan. Native Firebase file tetap membutuhkan konfigurasi environment.

## Perilaku keamanan dan delivery

- Inbox/event hanya dapat dibaca penerimanya. Pengguna tidak dapat menulis event, memilih penerima, membaca token perangkat, atau menjalankan claim worker.
- Registrasi memakai sesi Auth yang masih ada, UUID instalasi dan bukti acak yang disimpan di SecureStore. Token unik; akun lain tidak dapat mengambil token hanya dengan mengetahui string token. Recovery reinstall dengan token sama diizinkan untuk pemilik akun yang sama; recovery lintas akun tanpa bukti instalasi memerlukan penanganan operasional.
- Logout mencoba melepaskan perangkat sebelum sign out; worker juga memeriksa auth.sessions, deaktivasi akun, pemilik perangkat dan preferensi sebelum claim. Logout lama tidak dapat melepaskan binding baru milik akun lain.
- Snapshot project/environment pada delivery mencegah job mengikuti perpindahan environment instalasi. Untuk isolasi data bisnis, gunakan proyek Supabase staging terpisah; label environment saja bukan isolasi database.
- Ketukan push membawa notification_id saja. Aplikasi memuat ulang recipient milik akun aktif sebelum membuka route yang ditentukan dari event server. URL arbitrer dari push tidak dijalankan.
- Lock-screen body selalu generik; tidak mengandung isi tiket, chat, nomor telepon, koordinat atau token. Request yang sudah diterima FCM/APNs tidak dapat ditarik kembali saat logout; body generik dan pengecekan akses saat membuka tetap diperlukan.
- Registrasi otomatis tidak meminta izin. Setelah biodata tersimpan ada pilihan menuju pengaturan notifikasi; dialog OS baru diminta setelah pengguna memilih push. Preferensi berlaku per akun untuk semua perangkat; izin OS berlaku per perangkat. Berita default false, push_enabled default false.
- Jam tenang opsional 22.00–07.00 WIB. Berita/kegiatan dibatasi satu job per perangkat per 15 menit dan tetap tunduk pada jam tenang. Verifikasi/balasan support melewati pembatas broadcast tetapi tetap menghormati izin dan preferensi.
- Worker claim menggunakan SKIP LOCKED dan lease, maksimal 50 send + 50 receipt per invocation. Skalakan throughput setelah mengukur panjang antrean dan fanout; fanout saat ini berlangsung dalam transaksi pemicu, bukan job broadcast terpisah.
- HTTP 429/5xx dan MessageRateExceeded memakai backoff dengan maksimal lima percobaan kirim. Outcome jaringan yang tidak pasti/missing ticket menjadi unknown dan tidak dikirim ulang otomatis. Exactly-once dari provider tidak dijanjikan.
- Receipt dipoll mulai 15 menit setelah ticket diterima. delivered berarti handoff ke layanan platform berhasil, bukan bukti pengguna melihat atau membaca. read_at terpisah.
- DeviceNotRegistered menonaktifkan token yang sama tanpa menonaktifkan token baru hasil rotasi. Job kedaluwarsa setelah 24 jam; TTL payload dibatasi sisa masa berlaku dan maksimal satu jam.
- Konteks bisnis diperiksa ulang: tiket dihapus/berpindah pemilik, berita tidak terpublikasi, keanggotaan komunitas dicabut atau verifikasi hilang membuat job tertunda dibatalkan.
- Error provider disimpan sebagai kode terbatas; response body/token/isi pesan tidak ditulis ke log. Tidak ada penghapusan inbox historis otomatis; kebijakan retensi perlu disepakati sebelum menambahkan cleanup.

## Aktivasi staging

1. Tinjau migration 006 terhadap schema, trigger dan grants aktual. Baseline database belum lengkap di folder migration lokal; jangan menjalankan seluruh folder secara membabi buta pada database baru/production. Terapkan pada staging yang cocok, lalu regenerasi types. Helper client sementara memakai SupabaseClient untuk resource baru yang belum terdapat pada generated Database.
2. Daftarkan Android app yang sesuai package aplikasi pada Firebase, sediakan google-services.json sebagai EAS file variable `GOOGLE_SERVICES_JSON`, dan konfigurasi kredensial FCM v1 pada proyek EAS. `.gitignore` mencegah file root tersebut ikut di-track. Jangan menaruh service-account key di EXPO_PUBLIC_* atau repository.
3. Konfigurasi APNs untuk bundle iOS yang sama melalui EAS credentials. Gunakan Expo projectId yang sesuai; jangan menganggap kredensial sudah valid hanya karena konfigurasi JS lolos.
4. Aktifkan enhanced push security di proyek Expo dan sediakan Expo access token yang berwenang pada worker.
5. Set secret worker: `PUSH_DISPATCH_SECRET` (acak, minimal 32 karakter), `PUSH_ENVIRONMENT` (development/preview/production), `PUSH_PROJECT_ID`, `EXPO_PUSH_ACCESS_TOKEN`. `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia pada runtime Edge Supabase dan harus diverifikasi. Tidak ada nilai secret yang dicatat dalam panduan ini.
6. Deploy function `push-dispatch` melalui alur deployment staging yang disetujui. Config function menonaktifkan verify_jwt karena scheduler menggunakan secret khusus; handler menolak request tanpa secret yang benar. Jangan menghapus pemeriksaan secret atau membuka endpoint send untuk client.
7. Siapkan pg_cron, pg_net dan Vault. Simpan URL function lengkap pada `satu_push_worker_url` serta secret yang sama pada `satu_push_dispatch_secret`; tinjau dan jalankan schedule-push.sql sekali. Supabase mencatat request HTTP sementara di antrean pg_net, sehingga akses database/Vault/net tetap harus dibatasi. Scheduler memanggil worker per menit.
8. Buat binary development/preview baru dan pasang di perangkat. Penambahan modul native memerlukan binary baru; bukan OTA untuk binary lama. Sebelum rilis production, naikkan versi/runtime yang sesuai agar OTA tidak mengirim kode modul baru ke binary lama. Implementasi tidak menaikkan versi atau merilis build secara otomatis.
9. Dari screen Notifikasi, aktifkan push dan kategori yang diinginkan. Uji event dengan akun/data sintetis pada staging; tidak ada test button untuk broadcast ke pengguna production.

Nama environment di eas.json disetel eksplisit; default lokal adalah development. Worker yang dikonfigurasi development tidak memproses delivery production. Satu deployment worker memakai satu environment; jangan memakai production sebagai lingkungan tes.

## Pengujian dan observasi

Handler Android mengizinkan sound agar heads-up dapat tampil; channel updates baru memakai HIGH/default sound. Pengaturan channel yang sudah ada tetap dikontrol pengguna/OS. Pengguna mengonfirmasi banner berhasil pada POCO. Ini tidak membuktikan pengiriman remote sampai perangkat.

Tombol diagnostik dan script pengirim tes sementara sudah dihapus atas permintaan pengguna. Pembatalan notifikasi lokal sementara dan penghapusan channel diagnostik dilakukan sekali saat aplikasi dimuat ulang; channel updates dan notifikasi bisnis dipertahankan. Jalur logout normal aplikasi mobile dan dashboard admin memakai scope local agar keluar di browser tidak mencabut sesi Android lain. Perubahan aplikasi tetap di dev.

Frontend: `npm run test:push`, `npm run test:product`, `npx tsc --noEmit`, serta export Android+iOS. Support: `npm run test:push`, `npm run test:product`, `npm run build`.

Database fixture terisolasi:

```sh
npm install --prefix /tmp/satu-dev-db-check @electric-sql/pglite@0.5.15 --no-audit --no-fund
PRODUCT_DB_TEST_MODULE=/tmp/satu-dev-db-check/node_modules/@electric-sql/pglite/dist/index.js npm run test:push-db
```

Worker: jalankan `deno check --no-lock --node-modules-dir=manual supabase/functions/push-dispatch/index.ts`. Next tsconfig mengecualikan runtime Edge karena memakai Deno, bukan runtime Next.

Snapshot historis pemeriksaan lokal: tes perangkat, worker/API dan PostgreSQL WASM pernah dijalankan. Bukti lama tersimpan pada workspace audit; ini bukan bukti delivery provider atau perangkat nyata.

Uji perangkat yang wajib sebelum rollout: Android/iOS foreground/background/terminated, permission ditolak/diubah, token rotasi/reinstall, logout offline dan akun A→B, dua perangkat, inbox pagination/read state, ketukan push ke tiket setelah login browser, dan kegagalan/receipt provider nyata. Tes lokal tidak menggantikan uji ini atau menjamin policy production.

Monitor agregat status delivery, umur queued/receipt, jumlah unknown/failed, error_code, token nonaktif dan jumlah inbox belum dibaca. Jangan menyamakan ticket/receipt/read dan jangan mengambil token lengkap ke dashboard/log umum. unknown memerlukan investigasi, bukan reset massal menjadi queued.

Untuk penghentian operasional, nonaktifkan scheduler dan worker; inbox tetap tersedia. Pertahankan riwayat delivery dan jangan menghapus tabel atau mengembalikan grant client untuk memulihkan pengiriman.

Referensi: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [send dan receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [Supabase scheduler](https://supabase.com/docs/guides/functions/schedule-functions).
