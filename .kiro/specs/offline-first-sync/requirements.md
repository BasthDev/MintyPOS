# Requirements Document

## Introduction

MintyPOS adalah aplikasi POS (Point-of-Sale) berbasis React Native / Expo (SDK v54) dengan arsitektur **offline-first**: SQLite (`expo-sqlite`) sebagai primary storage lokal, dan Supabase sebagai cloud backup/sync. Fitur ini mencakup empat area utama:

1. **Global Auth Gate** — Login dipindahkan dari hanya tersedia via redirect ke `/(auth)` menjadi sebuah gate di root layout yang membungkus semua route protected, sehingga tidak ada celah masuk ke halaman protected tanpa autentikasi.
2. **Offline-First Sync Infrastructure** — Perbaikan arsitektur sync (SQLite ↔ Supabase), termasuk fix bug race condition, double-counting, push tanpa transaksi, dan delta sync yang tidak konsisten.
3. **SyncBanner** — Banner status koneksi/sync yang persistent dan tampil di atas semua layar (di bawah status bar), memberikan visibilitas real-time ke pengguna tentang status online/offline/syncing/error.
4. **Bug Fixes** — Perbaikan bug spesifik pada `SyncContext`, `SyncModal`, `SyncService`, dan `(protected)/_layout.tsx`.

---

## Glossary

- **Auth_Gate**: Komponen React di root layout yang memeriksa status autentikasi dan memblokir render halaman protected jika user belum login, menggantikan pola redirect dari `app/index.tsx`.
- **AuthProvider**: Context provider di `constants/auth.tsx` yang mengelola state `user` dan `isLoading`.
- **SyncService**: Kelas di `services/syncService.ts` yang menjalankan sinkronisasi bidireksional SQLite ↔ Supabase.
- **SyncContext**: React context di `constants/syncContext.tsx` yang menyimpan state visibilitas modal sync dan referensi ke sync function.
- **SyncModal**: Komponen modal di `components/SyncModal.tsx` yang menampilkan progress sync per-entity.
- **SyncBanner**: Komponen banner baru yang akan dibuat, ditampilkan persisten di root layout untuk menampilkan status koneksi dan sync.
- **Sync_Function**: Fungsi async `(onProgress: (p: SyncProgress) => void) => Promise<SyncResult>` yang disimpan di SyncContext dan dipanggil oleh SyncModal.
- **Protected_Route**: Semua halaman di bawah `app/(protected)/`.
- **SYNC_ENTITIES**: Array 20 entitas yang didefinisikan di `lib/syncConfig.ts`, diproses secara berurutan sesuai dependensi foreign key.
- **Delta_Sync**: Strategi sync yang hanya memproses record yang diubah sejak `lastSyncedAt`, menggunakan kolom `updated_at` atau `created_at`.
- **Owner**: Pengguna yang login via Supabase Auth (email/password atau Google OAuth), memiliki peran `Admin`.
- **Staff**: Pengguna yang login via username/password lokal (SQLite `staff` table), bisa berperan `Manager`, `Cashier`, atau `Staff`.
- **Network_Monitor**: Modul yang menggunakan `@react-native-community/netinfo` untuk mendeteksi status koneksi secara real-time.
- **Splash_Guard**: Layar loading yang ditampilkan saat `AuthProvider.isLoading === true` sebelum Auth_Gate memutuskan route mana yang ditampilkan.

---

## Requirements

### Requirement 1: Global Auth Gate di Root Layout

**User Story:** Sebagai pengguna MintyPOS, saya ingin login muncul sebagai gate di root layout sehingga tidak ada halaman protected yang bisa diakses tanpa autentikasi, bukan hanya sebagai redirect dari halaman index.

#### Acceptance Criteria

1. THE Auth_Gate SHALL membungkus semua child routes dalam `app/(protected)/` dan hanya merender child tersebut jika `user !== null`.
2. WHEN `AuthProvider.isLoading === true`, THE Auth_Gate SHALL menampilkan Splash_Guard (layar loading) sebagai pengganti konten protected, bukan layar kosong.
3. WHEN `user === null` DAN `AuthProvider.isLoading === false`, THE Auth_Gate SHALL menampilkan layar login dan tidak merender protected content sama sekali, tanpa melakukan `router.replace`.
4. WHEN `user !== null`, THE Auth_Gate SHALL merender route yang diminta dalam ≤ 500ms setelah user state tersedia.
5. THE Auth_Gate SHALL ditempatkan sebagai komponen di dalam `app/(protected)/_layout.tsx` sehingga berlaku untuk semua route di bawah `(protected)`.
6. WHEN user berhasil login, THE Auth_Gate SHALL menyembunyikan layar login dan memperlihatkan halaman protected yang diminta dalam ≤ 500ms tanpa full navigation reset.
7. IF `getSession()` melempar exception saat `AuthProvider` memuat session, THEN THE Auth_Gate SHALL menampilkan layar login dengan pesan yang memberitahu bahwa koneksi tidak tersedia, bukan layar error kosong.
8. THE Auth_Gate SHALL menerapkan perilaku gate yang identik untuk `userType === 'owner'` dan `userType === 'staff'`: (a) keduanya diblokir jika `user === null`, (b) keduanya diizinkan jika `user !== null`, (c) keduanya melihat Splash_Guard saat `isLoading === true`.
9. THE `app/index.tsx` root routing guard SHALL tetap berfungsi sebagai initial route resolver yang mengarahkan ke `/(auth)`, `/(new)`, `/(protected)/setup-store`, atau `/(protected)` sesuai dengan kondisi user yang sudah ada.
10. WHEN Auth_Gate aktif dan user sudah terautentikasi, THE Drawer SHALL dapat dibuka, ditutup, dan menampilkan menu items yang sesuai dengan peran user di semua halaman protected.

---

### Requirement 2: Offline-First Architecture (SQLite sebagai Primary Storage)

**User Story:** Sebagai pengguna MintyPOS, saya ingin aplikasi tetap berfungsi penuh secara offline menggunakan data lokal SQLite, sehingga operasi POS tidak terganggu ketika tidak ada koneksi internet.

#### Acceptance Criteria

1. THE Application SHALL menggunakan SQLite lokal sebagai sumber data utama (primary read/write) untuk operasi transaksi checkout, penambahan produk, pembacaan laporan, dan pengelolaan inventaris, terlepas dari status koneksi jaringan.
2. WHEN aplikasi pertama kali dijalankan tanpa koneksi internet, THE DatabaseInitializer SHALL menginisialisasi SQLite database dari cache lokal tanpa melakukan network request.
3. WHILE jaringan tidak tersedia, THE Application SHALL memungkinkan pengguna melakukan transaksi POS, menambah produk, dan melihat laporan dari data lokal — tidak menampilkan error dialog, tidak crash, dan mengembalikan data dari SQLite lokal.
4. WHEN koneksi jaringan kembali tersedia setelah periode offline, THE SyncBanner SHALL menampilkan opsi untuk melakukan sync ke cloud dalam ≤ 3 detik setelah koneksi terdeteksi.
5. THE Application SHALL menyimpan semua perubahan lokal dengan timestamp `updated_at` yang sesuai dengan waktu perangkat pada saat perubahan terjadi, dengan presisi hingga detik.
6. IF device kehabisan ruang penyimpanan saat inisialisasi database, THEN THE DatabaseInitializer SHALL menampilkan pesan error yang menyebutkan nama operasi yang gagal dan jumlah ruang yang dibutuhkan.
7. IF SQLite write gagal saat aplikasi sedang offline, THEN THE Application SHALL menampilkan pesan error yang spesifik untuk operasi tersebut dan tidak menyimpan partial data.
8. IF cache lokal SQLite tidak ditemukan atau rusak saat aplikasi pertama kali dijalankan, THEN THE DatabaseInitializer SHALL membuat database baru dari skema default dan menampilkan pesan bahwa data lokal tidak ditemukan.

---

### Requirement 3: Sync Infrastructure — Perbaikan SyncContext Race Condition

**User Story:** Sebagai developer MintyPOS, saya ingin SyncContext menyimpan sync function secara reliable sebelum modal ditampilkan, sehingga tidak ada kasus di mana SyncModal muncul tapi sync tidak berjalan karena race condition.

#### Acceptance Criteria

1. WHEN `showSyncModal` dipanggil, THE GlobalSyncModal SHALL hanya dirender jika `syncFunction` ref sudah berisi nilai non-null pada saat render tersebut.
2. THE SyncContext SHALL menyediakan fungsi gabungan `startSync(fn: SyncFunction, isLogout?: boolean)` yang menetapkan sync function ke ref dan mengubah `isSyncModalVisible` menjadi `true` dalam satu synchronous call, menggantikan pola panggil-terpisah `setSyncFunction` + `showSyncModal`.
3. IF `isSyncModalVisible === true` DAN `syncFunction` ref bernilai `null` saat GlobalSyncModal mencoba render, THEN THE GlobalSyncModal SHALL menampilkan error state dengan tombol dismiss yang dapat ditekan untuk menutup modal.
4. THE sync function SHALL disimpan menggunakan React `useRef` sehingga nilai terbaru selalu tersedia tanpa bergantung pada re-render cycle.
5. WHEN `hideSyncModal` dipanggil, THE SyncContext SHALL mereset `syncFunction` ref menjadi `null`, `isSyncModalVisible` menjadi `false`, dan `isLogoutSync` menjadi `false`.

---

### Requirement 4: Sync Infrastructure — Perbaikan SyncService Push Phase

**User Story:** Sebagai pengguna MintyPOS, saya ingin data yang telah berhasil di-push ke cloud terlacak dengan benar sehingga sync berikutnya tidak menduplikasi data dan `lastSyncedAt` hanya diupdate jika semua entity berhasil.

#### Acceptance Criteria

1. THE SyncService SHALL hanya mengupdate `lastSyncedAt` di AsyncStorage jika seluruh push phase dan pull phase selesai tanpa error — di mana "error" didefinisikan sebagai exception yang tidak tertangkap atau kegagalan yang menyebabkan satu atau lebih entity tidak dapat diproses sama sekali.
2. IF push phase untuk satu entity gagal setelah sebagian batch berhasil di-upload, THEN THE SyncService SHALL mencatat entity tersebut sebagai failed di `result.errors`, melanjutkan ke entity berikutnya, dan tidak memperbarui `lastSyncedAt`.
3. THE SyncService SHALL menyimpan daftar entity yang telah berhasil di-push dalam sesi sync saat ini, sehingga entity tersebut tidak di-push ulang jika sync dijalankan kembali dalam sesi yang sama.
4. WHEN semua entity dalam push phase selesai diproses (sukses maupun gagal), THE SyncService SHALL langsung memulai pull phase tanpa intervensi manual.
5. THE SyncService SHALL memproses push dalam batch dengan maksimum 50 records per batch, dan SHALL melanjutkan ke batch berikutnya meskipun satu batch gagal, dengan mencatat error untuk setiap batch yang gagal.
6. FOR ALL entity yang memiliki kolom `updated_at`, THE SyncService SHALL menggunakan filter `updated_at > lastSyncedAt` pada push query untuk mencegah full-table push.
7. IF sebuah entity table tidak memiliki kolom `updated_at` maupun `created_at`, THEN THE SyncService SHALL melakukan full push untuk table tersebut dan SHALL mencatat warning di log.
8. IF pull phase gagal setelah push phase sukses, THEN THE SyncService SHALL tidak mengupdate `lastSyncedAt` dan SHALL mencatat semua entity pull yang gagal di `result.errors`.

---

### Requirement 5: Sync Infrastructure — Perbaikan SyncService Pull Phase

**User Story:** Sebagai pengguna MintyPOS, saya ingin data yang di-pull dari cloud diaplikasikan ke SQLite secara transaksional dan aman, sehingga tidak ada data corrupted jika pull gagal di tengah jalan.

#### Acceptance Criteria

1. THE SyncService pull phase SHALL menggunakan satu transaksi SQLite (`BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`) yang mencakup seluruh pull phase, bukan per-entity.
2. IF terjadi error saat mengaplikasikan data pull untuk satu entity, THEN THE SyncService SHALL melakukan `ROLLBACK` untuk seluruh pull phase dan mencatat entry di `result.errors` dengan format `[EntityType]: error message` untuk setiap entity yang gagal, dan data SQLite lokal SHALL tetap dalam kondisi identik dengan sebelum pull phase dimulai.
3. WHEN pull phase selesai (baik COMMIT maupun ROLLBACK), THE SyncService SHALL mengeksekusi `PRAGMA foreign_keys = ON` di blok `finally` untuk memastikan foreign key constraints aktif kembali.
4. WHEN data cloud row memiliki kolom yang tidak ada di SQLite local schema, THE SyncService SHALL memfilter kolom tersebut sebelum insert — jika seluruh kolom row tidak cocok dengan schema, row tersebut SHALL di-skip dan dicatat sebagai warning di log.
5. THE SyncService SHALL menggunakan `INSERT OR REPLACE` (behavior saat ini via `buildInsertSQL`) untuk memastikan update data yang sudah ada secara idempoten.
6. FOR ALL valid `storeId` dengan data di Supabase, hasil pull phase SHALL menghasilkan row count dan nilai kolom yang identik di SQLite lokal dengan yang ada di Supabase untuk setiap entity yang di-pull (round-trip property).

---

### Requirement 6: Perbaikan SyncModal — Double-Counting totalPushed/totalPulled

**User Story:** Sebagai pengguna MintyPOS, saya ingin statistik "Total Pushed" dan "Total Pulled" di SyncModal akurat sehingga saya tahu persis berapa record yang berhasil disinkronisasi.

#### Acceptance Criteria

1. THE SyncModal SHALL menghitung `totalPushed` dari nilai `SyncResult` yang di-resolve oleh `syncFunction` (bukan dari akumulasi progress event), sehingga nilai yang ditampilkan identik dengan nilai yang dilaporkan oleh SyncService.
2. THE SyncModal SHALL menghitung `totalPulled` dari nilai `SyncResult` yang di-resolve oleh `syncFunction` (bukan dari akumulasi progress event), sehingga nilai yang ditampilkan identik dengan nilai yang dilaporkan oleh SyncService.
3. WHEN `syncFunction` resolve, THE SyncModal SHALL mengupdate `totalPushed` dan `totalPulled` tepat satu kali dari nilai `SyncResult`, bukan dari akumulasi progress events yang dapat terpanggil lebih dari sekali per entity.
4. THE SyncModal SHALL menampilkan `pushed` dan `pulled` count per-entity berdasarkan nilai terakhir pada progress event untuk entity tersebut, bukan akumulasi dari semua event.
5. WHEN `currentPhase === 'complete'`, THE SyncModal SHALL menampilkan ringkasan yang mencantumkan: total record pushed, total record pulled, dan jumlah entity dengan `status === 'completed'`.
6. IF `syncFunction` melempar exception, THEN THE SyncModal SHALL menampilkan pesan error yang menyertakan teks dari `exception.message` dan SHALL menampilkan tombol dismiss yang dapat ditekan.
7. IF `syncFunction` melempar exception, THEN THE SyncModal SHALL mengubah `currentPhase` menjadi `'error'` dan `canClose` menjadi `true`.

---

### Requirement 7: SyncBanner — Status Koneksi dan Sync Real-Time

**User Story:** Sebagai pengguna MintyPOS, saya ingin melihat banner status di atas semua layar yang memberitahu saya apakah aplikasi sedang offline, online, sedang sync, atau ada error sync, sehingga saya selalu tahu kondisi data saya.

#### Acceptance Criteria

1. THE SyncBanner SHALL di-render di `app/_layout.tsx` di bawah `StatusBar` dan di atas `Stack` navigator, sehingga terlihat di semua route kecuali `/(auth)` dan `/(new)`.
2. WHEN `NetInfo.isConnected === false`, THE SyncBanner SHALL menampilkan teks "Offline — Data tersimpan lokal" dengan warna background kuning/amber (`#F59E0B`) dan teks putih.
3. WHEN `NetInfo.isConnected === true` DAN tidak ada sync yang sedang berjalan DAN tidak ada error sync, THE SyncBanner SHALL tidak terlihat (height = 0, opacity = 0).
4. WHEN sync sedang berjalan (`isSyncing === true`), THE SyncBanner SHALL menampilkan teks "Menyinkronkan data..." dengan indikator animasi berputar dan warna background biru (`#3B82F6`).
5. WHEN sync berhasil selesai (`syncStatus === 'success'`), THE SyncBanner SHALL menampilkan teks "Tersinkronisasi" dengan warna background hijau (`#10B981`) selama tepat 3 detik, kemudian menyembunyikan diri secara otomatis.
6. WHEN `syncStatus === 'error'`, THE SyncBanner SHALL menampilkan teks "Sync gagal — Coba lagi" dengan warna background merah (`#EF4444`) dan tombol "Retry" yang jika ditekan memicu `startSync` ulang.
7. THE SyncBanner SHALL berlangganan ke `NetInfo.addEventListener` (bukan polling) untuk mendeteksi perubahan koneksi secara real-time dan unsubscribe saat komponen di-unmount.
8. WHEN route aktif adalah `/(auth)` atau `/(new)`, THE SyncBanner SHALL tidak di-render sama sekali (bukan hanya hidden).
9. WHEN `NetInfo.isConnected === false` DAN nilai `lastSyncedAt` tersedia di AsyncStorage, THE SyncBanner SHALL menampilkan teks tambahan "Terakhir sync: X menit lalu" di bawah teks utama, di mana X adalah selisih menit antara waktu saat ini dan `lastSyncedAt`.
10. WHEN SyncBanner berpindah dari tidak terlihat ke terlihat, THE Banner SHALL menggunakan animasi `translateY` dari `-100%` ke `0` dalam 250ms; WHEN berpindah dari terlihat ke tidak terlihat, THE Banner SHALL menggunakan animasi `translateY` dari `0` ke `-100%` dalam 200ms.
11. WHERE `colorMode === 'dark'`, THE SyncBanner SHALL menggunakan warna teks `#FFFFFF` dan menggunakan `theme.card` sebagai fallback background jika state adalah normal (online, tidak sync).

---

### Requirement 8: Network-Aware Auto Sync

**User Story:** Sebagai pengguna MintyPOS, saya ingin aplikasi secara otomatis mencoba sync ketika koneksi internet kembali tersedia setelah periode offline, sehingga data lokal saya tersinkronisasi tanpa intervensi manual.

#### Acceptance Criteria

1. WHEN status jaringan berubah dari `isConnected === false` ke `isConnected === true`, IF `user !== null` DAN `activeStore !== null`, THEN THE Network_Monitor SHALL memicu auto-sync setelah delay 2000ms (debounce) untuk menghindari trigger ganda akibat fluktuasi koneksi.
2. WHEN auto-sync hendak dimulai, IF tidak ada unsynced record (semua data sudah di-push), THEN THE Network_Monitor SHALL tidak memicu sync dan SyncBanner SHALL tetap tersembunyi.
3. WHEN auto-sync dipicu, THE SyncBanner SHALL menampilkan status "Menyinkronkan data..." sesuai Requirement 7.4.
4. IF auto-sync gagal, THEN THE SyncBanner SHALL menampilkan status error sesuai Requirement 7.6, dan THE Network_Monitor SHALL tidak memicu auto-sync lagi hingga terjadi transisi offline→online berikutnya.
5. THE auto-sync SHALL memanggil `SyncProcess.sync` dengan callback progress yang sama yang digunakan oleh sync manual, untuk konsistensi behavior.
6. WHEN auto-sync sedang berjalan (`isSyncing === true`), THE manual sync trigger di drawer SHALL dirender dalam disabled state dan tidak dapat ditekan.
7. IF `isSyncing === false` DAN tidak ada unsynced record terdeteksi saat koneksi kembali, THEN THE SyncBanner SHALL tidak menampilkan notifikasi apapun.

---

### Requirement 9: SyncModal sebagai Global Overlay di Root Layout

**User Story:** Sebagai pengguna MintyPOS, saya ingin SyncModal progress window tampil di atas semua layar (bukan hanya di dalam drawer), sehingga progress sync terlihat meskipun drawer ditutup.

#### Acceptance Criteria

1. THE `GlobalSyncModal` component SHALL di-render di `app/_layout.tsx` sebagai sibling setelah `Stack` navigator dalam z-order, sehingga ia muncul di atas semua route screen.
2. WHEN `isSyncModalVisible === true` DAN `syncFunctionRef.current !== null`, THE GlobalSyncModal SHALL merender komponen `SyncModal` dengan `syncFunction` diambil dari `useRef` (bukan dari React state).
3. THE SyncModal SHALL hanya menampilkan tombol dismiss (close button di header dan Close button di footer) WHEN `isComplete === true` ATAU `currentPhase === 'error'`; dalam kondisi lain tombol dismiss SHALL tidak dirender.
4. WHEN SyncModal di-close DAN `isLogoutSync === true`, THE SyncContext SHALL mengeksekusi `onSyncComplete` callback (yang berisi `signOut()` dan `router.replace('/(auth)')`) setelah `hideSyncModal()` selesai.
5. WHEN `isSyncModalVisible === true` DAN `syncFunctionRef.current === null`, THE GlobalSyncModal SHALL merender error state dengan satu tombol "Tutup" yang memanggil `hideSyncModal()`.

---

### Requirement 10: Logout dengan Sync (Pre-Logout Sync Flow)

**User Story:** Sebagai pengguna MintyPOS, saya ingin data lokal selalu di-sync ke cloud sebelum logout sehingga tidak ada data yang hilang ketika berpindah perangkat atau sesi.

#### Acceptance Criteria

1. WHEN user menekan tombol Logout di drawer, THE Drawer SHALL menampilkan dialog konfirmasi dengan pilihan "Lanjutkan" dan "Batal" sebelum memulai sync atau logout.
2. WHEN user memilih "Lanjutkan" pada dialog konfirmasi, THE Drawer SHALL memanggil `startSync(fn, true)` di mana `fn` adalah `SyncProcess.sync` dan parameter kedua `true` menandai ini adalah logout sync.
3. WHEN pre-logout sync berhasil selesai (`syncStatus === 'success'`) DAN `isLogoutSync === true`, THE SyncContext SHALL mengeksekusi `signOut()` diikuti oleh `router.replace('/(auth)')`.
4. WHEN pre-logout sync gagal (`syncStatus === 'error'`) DAN `isLogoutSync === true`, THE SyncModal SHALL menampilkan dialog dengan dua pilihan: (a) "Lanjutkan Logout" yang tetap mengeksekusi `signOut()`, dan (b) "Batal" yang menutup modal tanpa logout.
5. WHEN `signOut()` dieksekusi sebagai bagian dari logout flow, THE Application SHALL menutup semua SQLite database instances aktif sebelum navigasi ke `/(auth)`.
6. WHEN user memilih "Batal" pada dialog konfirmasi logout awal (sebelum sync dimulai), THE Application SHALL menutup dialog dan user tetap berada di layar yang sama tanpa perubahan state apapun.

---

### Requirement 11: Staff Login — Local-First Authentication

**User Story:** Sebagai staff toko MintyPOS, saya ingin bisa login menggunakan username dan password lokal bahkan ketika tidak ada koneksi internet, sehingga saya dapat bekerja di toko tanpa bergantung pada cloud.

#### Acceptance Criteria

1. THE Staff_Login flow SHALL memanggil `StaffProcess.login(username, password)` dan `StaffService.getCurrentSession()` yang beroperasi sepenuhnya dari SQLite lokal, tanpa network request ke Supabase.
2. WHEN `StaffProcess.login()` berhasil dan mengembalikan session dengan `userType === 'staff'`, THE Auth_Gate SHALL merender route `/(protected)` dalam ≤ 500ms tanpa melewati store-selection routing.
3. THE Staff_Login flow SHALL menggunakan fungsi hash password yang ada di `StaffService` (tidak boleh diganti implementasinya) untuk memverifikasi credential terhadap hash yang tersimpan di SQLite.
4. WHEN staff logout, THE Application SHALL menghapus staff session dari AsyncStorage dan me-reset `user` state di `AuthProvider` menjadi `null`, sehingga Auth_Gate menampilkan layar login.
5. THE Staff_Login form SHALL tetap tersedia di halaman `/(auth)` pada tab "Store Staff" (existing UI dipertahankan, tidak ada perubahan pada form layout atau behavior).

---

### Requirement 12: Notifikasi Error Sync yang Actionable

**User Story:** Sebagai pengguna MintyPOS, saya ingin pesan error sync yang spesifik dan actionable sehingga saya tahu apa yang salah dan dapat mengambil tindakan yang tepat.

#### Acceptance Criteria

1. WHEN sync gagal karena `NetInfo.isConnected === false` saat sync dimulai, THE SyncService SHALL mengembalikan `SyncResult` dengan `errorCode: 'NETWORK_UNAVAILABLE'` dan pesan berbahasa Indonesia yang menjelaskan penyebab dan satu langkah yang dapat dilakukan user (contoh: "Periksa koneksi internet Anda").
2. WHEN sync gagal karena Supabase mengembalikan HTTP 401 atau error `JWT expired`, THE SyncService SHALL mencoba refresh token terlebih dahulu; jika refresh berhasil, SHALL melanjutkan sync; jika refresh gagal, SHALL mengembalikan `errorCode: 'AUTH_EXPIRED'`.
3. IF refresh token gagal (dari Requirement 12.2), THEN THE Application SHALL mengeksekusi `signOut()` secara otomatis dan menavigasi user ke `/(auth)`.
4. WHEN sync gagal karena database lokal error (SQLite exception dengan kode SQLITE_FULL atau SQLITE_CORRUPT), THE SyncService SHALL mengembalikan `errorCode: 'LOCAL_DB_ERROR'` dengan pesan yang menginformasikan user untuk menghubungi support.
5. WHEN sync gagal karena constraint violation di Supabase (duplicate key, missing foreign key), THE SyncService SHALL mencatat entry di `result.errors` dengan format `[EntityType][RecordId]: error message` dan melanjutkan ke record/entity berikutnya.
6. WHEN SyncModal menampilkan error state, THE SyncModal SHALL menampilkan `errorCode` dan deskripsi non-teknis (tanpa stack trace atau raw exception object) dalam bahasa yang dapat dipahami pengguna awam.
7. WHEN terdapat partial errors DAN user menekan tombol "Detail Error" di footer SyncModal, THE SyncModal SHALL menampilkan daftar error per entity yang mencantumkan: tipe entity, record ID, dan alasan error.