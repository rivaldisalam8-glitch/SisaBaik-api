import roti from "../assets/food-bread.svg";
import siapSaji from "../assets/food-bowl.svg";
import bahanSegar from "../assets/food-produce.svg";

const kategori = {
  roti: { label: "Roti & kue", gambar: roti, nada: "hangat" },
  "makanan-siap-saji": { label: "Makanan siap saji", gambar: siapSaji, nada: "hijau" },
  "bahan-segar": { label: "Bahan segar", gambar: bahanSegar, nada: "segar" },
};

export function visualKategori(nilai) {
  return kategori[nilai] ?? { label: nilai, gambar: siapSaji, nada: "hijau" };
}

export function labelStatus(nilai) {
  return {
    aktif: "Aktif", draft: "Draft", habis: "Stok habis",
    kedaluwarsa: "Kedaluwarsa", ditutup: "Ditutup",
  }[nilai] ?? String(nilai ?? "").replaceAll("-", " ");
}

export function sisaWaktu(iso, sekarang) {
  const menit = Math.ceil((Date.parse(iso) - sekarang) / 60000);
  if (!Number.isFinite(menit) || menit <= 0) return "Waktu berakhir";
  if (menit < 60) return `${menit} menit lagi`;
  if (menit < 1440) return `${Math.ceil(menit / 60)} jam lagi`;
  return `${Math.ceil(menit / 1440)} hari lagi`;
}

export function formatRupiah(angka) {
  if (angka === null || angka === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(angka);
}

export function formatTanggal(waktu) {
  if (!waktu) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(waktu));
}

export function labelPesanan(status) {
  switch (status) {
    case 'menunggu-konfirmasi': return 'Menunggu Konfirmasi';
    case 'dikonfirmasi': return 'Dikonfirmasi Penyedia';
    case 'siap-diambil': return 'Siap Diambil';
    case 'selesai': return 'Selesai';
    case 'dibatalkan': return 'Dibatalkan';
    default: return status;
  }
}

export function labelPembayaran(pesanan) {
  if (!pesanan) return 'Belum dibayar';
  if (pesanan.statusPembayaran === 'dibayar') return 'Sudah Dibayar';
  if (pesanan.statusPembayaran === 'gratis') return 'Gratis (Rp 0)';
  return 'Belum Dibayar di Tempat';
}