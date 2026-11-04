\# Hasil Pengujian Chapter 9 – SisaBaik



\## 1. Identitas Pengujian



\- Nama proyek: SisaBaik

\- Modul: Chapter 9 – Frontend

\- Nama penguji: \[Isi nama]

\- Tanggal pengujian: 4 November 2026

\- Node.js: v24.16.0

\- npm: 11.13.0

\- Framework: Vue.js 3

\- Build tool: Vite 8.3.3



\## 2. Hasil Pengujian Katalog Pembeli



Katalog penawaran berhasil ditampilkan melalui browser. Logo dan aset makanan berhasil dimuat tanpa error.



Fitur pencarian dan filter kategori telah diuji dan berfungsi sesuai harapan.



Status: BERHASIL



\## 3. Hasil Pengujian Empty State



Pengujian dilakukan dengan kondisi pencarian yang tidak menghasilkan penawaran. Tampilan empty state berhasil ditampilkan.



Status: BERHASIL



\## 4. Hasil Pengujian Formulir Penyedia



Pengujian dilakukan melalui dua kondisi:



1\. Formulir kosong: sistem menampilkan validasi ketika formulir dikirim tanpa data yang diperlukan.

2\. Formulir valid: sistem berhasil menerima penawaran baru dan menampilkannya pada katalog.



Status: BERHASIL



\## 5. Pengujian Tampilan Responsif



Tampilan aplikasi telah diperiksa pada ukuran layar mobile. Bukti tampilan mobile telah disimpan.



Status: SUDAH DIUJI



\## 6. Proses Build



Perintah yang digunakan:



`npm run build`



Hasil:

\- Vite berhasil memproses 23 modul.

\- File JavaScript, CSS, dan HTML berhasil dihasilkan.

\- Folder dist berhasil dibuat.

\- Waktu build: 532 ms.



Status: BERHASIL



\## 7. Komunikasi Antarkomponen Vue



Aplikasi menggunakan mekanisme komunikasi antarkomponen melalui props dan emits.



\### a. FilterPenawaran.vue

Menerima props `pencarian`, `kategori`, dan `daftarKategori`. Mengirim event `ubah-pencarian`, `ubah-kategori`, dan `reset` kepada komponen induk.



\### b. KartuPenawaran.vue

Menerima props `penawaran`, `waktuSekarang`, dan `bolehPilih`. Mengirim event `pilih` beserta ID penawaran ketika pengguna memilih makanan.



\### c. FormPenawaran.vue

Mengelola input dan validasi formulir secara internal. Setelah data dinyatakan valid, komponen mengirim event `simpan` beserta data penawaran kepada komponen induk.



\### d. App.vue

Berfungsi sebagai komponen induk yang mengelola data penawaran, pencarian, filter kategori, pemilihan penawaran, dan penambahan penawaran baru.



\## 8. Perhitungan Ringkasan Pembeli dan Penyedia



\### a. Ringkasan Pembeli

\- Penawaran tersedia: menghitung jumlah penawaran yang masih tersedia.

\- Unit tersedia: menjumlahkan stok dari seluruh penawaran yang masih tersedia.

\- Penyedia dengan stok tersedia: menghitung jumlah ID penyedia yang unik dari penawaran yang masih tersedia.



\### b. Ringkasan Penyedia

\- Penawaran saya: menghitung seluruh penawaran milik penyedia latihan Rina.

\- Penawaran tersedia: menghitung penawaran milik Rina yang masih tersedia.

\- Unit tersedia: menjumlahkan stok dari penawaran Rina yang masih tersedia.



Pemilihan penawaran oleh pembeli hanya merupakan pilihan sementara dan belum menjadi pesanan atau transaksi.



\## 9. Batasan Pengujian



Pada Chapter 9, frontend masih menggunakan fixture atau data latihan yang disimpan sementara di memori aplikasi.



Browser belum melakukan pemanggilan API ke backend. Perubahan data belum disimpan secara permanen ke database.



Backend Module 8 tetap menyediakan pendaftaran mandiri, verifikasi penyedia, autentikasi, dan otorisasi. Integrasi frontend dan backend direncanakan pada pertemuan 11.



\## 10. Bukti Pengujian



Seluruh screenshot disimpan di folder `docs/bukti-pengujian/`.



1\. `01-katalog.png`

2\. `02-empty-state.png`

3\. `03-validasi-form.png`

4\. `04-penawaran-valid.png`

5\. `05-mobile.png`

6\. `06-build.png`



\## 11. Kesimpulan



Berdasarkan pengujian, frontend SisaBaik berhasil dijalankan melalui browser. Katalog, pencarian, filter, empty state, validasi formulir, dan penambahan penawaran telah diuji.



Proses build berhasil dilakukan menggunakan Vite. Aplikasi pada Chapter 9 masih menggunakan data latihan lokal dan belum terintegrasi dengan API backend.

