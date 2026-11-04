# SisaBaik

SisaBaik merupakan aplikasi yang dikembangkan untuk mendukung pengelolaan dan penawaran makanan berlebih agar dapat dimanfaatkan oleh pihak yang membutuhkan.

## Persyaratan Sistem

- Node.js: v24.16.0
- npm: 11.13.0
- Framework frontend: Vue.js 3.
- Build tool: Vite.

## Struktur Frontend

Frontend berada di dalam folder `frontend/`.

Aset visual aplikasi disimpan pada `frontend/src/assets/`, meliputi:

- `brand-mark.svg`
- `food-bowl.svg`
- `food-bread.svg`
- `food-produce.svg`

Aset tersebut digunakan untuk menampilkan logo dan ilustrasi makanan pada aplikasi.

## Instalasi dan Menjalankan Frontend

Masuk ke direktori frontend:

```bash
cd frontend
```

Instal dependensi menggunakan salah satu perintah berikut:

```bash
npm install
```

Atau, jika ingin menginstal berdasarkan lockfile:

```bash
npm ci
```

Menjalankan aplikasi dalam mode pengembangan:

```bash
npm run dev
```

Membuat build untuk produksi:

```bash
npm run build
```

Melihat hasil build secara lokal:

```bash
npm run preview
```

## Data dan Fixture

Pada Module 9, frontend menggunakan fixture atau data latihan yang disimpan sementara di memori aplikasi.

Data tersebut digunakan untuk menampilkan contoh penawaran dan menguji interaksi pengguna. Data belum disimpan secara permanen ke database sehingga perubahan dapat hilang ketika halaman dimuat ulang atau aplikasi dijalankan kembali.

## Batasan Integrasi API

Pada Module 9, browser belum melakukan pemanggilan API ke backend. Seluruh interaksi frontend masih menggunakan data latihan lokal.

Backend Module 8 tetap menyediakan fitur:

- Pendaftaran pengguna secara mandiri.
- Verifikasi penyedia.
- Autentikasi pengguna.
- Otorisasi berdasarkan peran dan kepemilikan.

Integrasi antara frontend dan backend direncanakan untuk dilaksanakan pada pertemuan 11.

## Pengujian

Frontend dapat diuji melalui browser setelah menjalankan perintah:

```bash
npm run dev
```

Build aplikasi dapat diperiksa menggunakan:

```bash
npm run build
```