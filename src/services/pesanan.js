import { randomBytes } from "node:crypto";
import { pool } from "../db/pool.js";
import { transaksi } from "../db/transaksi.js";
import { HttpError, metaHalaman } from "../lib/api.js";
const headerSql = `SELECT ps.*, u.nama_lengkap AS nama_pemesan,
 py.nama_usaha AS penyedia FROM pesanan ps
 JOIN pengguna u ON u.id=ps.pembeli_id
 JOIN penyedia py ON py.id=ps.penyedia_id`;

function buatKodePengambilan() {
  return `AMBIL-${randomBytes(5).toString("hex").toUpperCase()}`;
}

 function aksiTersedia(row, pengguna) {
  if (pengguna.peran === "pembeli") {
    return row.status === "menunggu-konfirmasi" ? ["batal"] : [];
  }

  if (pengguna.peran === "penyedia") {
    if (row.status === "menunggu-konfirmasi") {
      return ["konfirmasi", "tolak"];
    }

    if (row.status === "dikonfirmasi") {
      return ["siap"];
    }

    if (row.status === "siap-diambil") {
      return ["selesai"];
    }
  }

  return [];
}
function keHeader(row, pengguna) {
  return {
    id: String(row.id),
    pembeliId: String(row.pembeli_id),
    penyediaId: String(row.penyedia_id),
    penyedia: row.penyedia,
    namaPemesan: row.nama_pemesan,
    status: row.status,
jenisPembatalan: row.jenis_pembatalan ?? null,
alasanPembatalan: row.alasan_pembatalan ?? null,
metodePembayaran: row.metode_pembayaran,
statusPembayaran: row.status_pembayaran,
    total: Number(row.total_transaksi),
    nilaiStokTerselamatkan: Number(row.nilai_stok_terselamatkan),
    dibuatPada: new Date(row.dibuat_pada).toISOString(),
    bolehAksi: aksiTersedia(row, pengguna),
dibayarPada: row.dibayar_pada
  ? new Date(row.dibayar_pada).toISOString()
  : null,
  };
}
function cakupan(pengguna) {
 if (pengguna.peran === "pembeli") {
 return { kolom: "ps.pembeli_id", id: pengguna.id };
 }
 if (pengguna.peran === "penyedia" && pengguna.penyediaId) {
 return { kolom: "ps.penyedia_id", id: pengguna.penyediaId };
 }
 throw new HttpError(
 403,
 "ROLE_FORBIDDEN",
 "Profil atau peran tidak diizinkan.",
 );
}
async function bacaDetail(id, client, pengguna) {
 const scope = cakupan(pengguna);
 const header = await client.query(
 `${headerSql} WHERE ps.id=$1 AND ${scope.kolom}=$2`,
 [id, scope.id],
 );
 if (!header.rowCount) {
 throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
 }
 const detail = await client.query(
 `SELECT dp.*,
 COALESCE(dp.nama_penawaran, p.nama) AS nama,
 COALESCE(dp.satuan, p.satuan) AS satuan
 FROM detail_pesanan dp
 JOIN penawaran p ON p.id=dp.penawaran_id
 WHERE dp.pesanan_id=$1
 ORDER BY dp.penawaran_id`,
 [id],
);
const pengambilan = await client.query(
  `SELECT kode, jadwal_pada, diambil_pada, status
   FROM pengambilan
   WHERE pesanan_id = $1`,
  [id],
);
 return {
  ...keHeader(header.rows[0], pengguna),
  pengambilan: pengambilan.rowCount
    ? {
        kode: pengambilan.rows[0].kode,
        jadwalPada: new Date(
          pengambilan.rows[0].jadwal_pada,
        ).toISOString(),
        status: pengambilan.rows[0].status,
        diambilPada: pengambilan.rows[0].diambil_pada
          ? new Date(
              pengambilan.rows[0].diambil_pada,
            ).toISOString()
          : null,
      }
    : null,
  items: detail.rows.map((row) => ({
    penawaranId: String(row.penawaran_id),
    nama: row.nama,
    kuantitas: row.kuantitas,
    satuan: row.satuan,
    hargaSatuan: Number(row.harga_penawaran_satuan),
    subtotal: Number(row.subtotal),
    nilaiStokTerselamatkan: Number(row.nilai_stok),
  })),
};
}
export function detailPesanan(id, pengguna) {
 return transaksi((client) => bacaDetail(id, client, pengguna), true);
}
export function daftarPesanan(paging, pengguna) {
 const scope = cakupan(pengguna);
 return transaksi(async (client) => {
 const count = await client.query(
 `SELECT COUNT(*)::int AS jumlah FROM pesanan ps WHERE ${scope.kolom}=$1`,
 [scope.id],
 );
 const hasil = await client.query(
 `${headerSql} WHERE ${scope.kolom}=$1
 ORDER BY ps.id DESC LIMIT $2 OFFSET $3`,
 [scope.id, paging.limit, paging.offset],
 );
 return {
 data: hasil.rows.map((row) => keHeader(row, pengguna)),
 meta: metaHalaman(count.rows[0].jumlah, paging),
 };
 }, true);
}
export function buatPesanan(data, pengguna) {
 return transaksi(async (client) => {
 const pembeli = await client.query(
 `SELECT id FROM pengguna WHERE id=$1
 AND peran='pembeli' AND aktif=TRUE`,
 [data.pembeliId],
 );
 if (!pembeli.rowCount) {
 throw new HttpError(
 404,
 "BUYER_NOT_FOUND",
 "Pembeli aktif tidak ditemukan.",
 );
 }
 const detail = [];
 let penyediaId;
 let totalNormal = 0n;
 for (const baris of data.items) {
 const hasil = await client.query(
 `SELECT p.* FROM penawaran p JOIN penyedia py ON py.id=p.penyedia_id
 JOIN pengguna u ON u.id=py.pengguna_id WHERE p.id=$1
 AND u.peran='penyedia' AND u.aktif=TRUE
 AND py.status_verifikasi='terverifikasi' FOR UPDATE OF p`,
 [baris.penawaranId],
 );
 if (!hasil.rowCount) {
 throw new HttpError(
 404,
 "OFFER_NOT_FOUND",
 "Penawaran tidak ditemukan.",
 );
 }
 const item = hasil.rows[0];
 const waktu = await client.query( `SELECT $1::timestamptz > clock_timestamp() AS belum_berakhir`,
 [item.berakhir_pada],
 );
 if (item.status !== "aktif" || !waktu.rows[0].belum_berakhir) {
 throw new HttpError(
 409,
 "OFFER_UNAVAILABLE",
 "Penawaran tidak tersedia.",
 );
 }
 if (item.stok < baris.kuantitas) {
 throw new HttpError(
 409,
 "INSUFFICIENT_STOCK",
 `Stok ${item.nama} tidak mencukupi.`,
 );
 }
 penyediaId ??= String(item.penyedia_id);
 if (penyediaId !== String(item.penyedia_id)) {
 throw new HttpError(
 409,
 "MIXED_PROVIDER",
 "Satu pesanan harus dari satu penyedia.",
 );
 }
 totalNormal += BigInt(item.harga_normal) * BigInt(baris.kuantitas);
 if (totalNormal > 999999999999n) {
 throw new HttpError(
 409,
 "ORDER_TOTAL_LIMIT",
 "Total melampaui kapasitas skema.",
 );
 }
 detail.push({ ...baris, item });
 }
 const pesanan = await client.query(
 `INSERT INTO pesanan (pembeli_id, penyedia_id)
 VALUES ($1,$2) RETURNING id`,
 [pembeli.rows[0].id, penyediaId],
 );
 const id = pesanan.rows[0].id;
 for (const { item, kuantitas } of detail) {
 await client.query(
 `INSERT INTO detail_pesanan (
 pesanan_id, penawaran_id, penyedia_id, kuantitas,
 harga_normal_satuan, harga_penawaran_satuan,
 nama_penawaran, satuan
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
[
 id,
 item.id,
 penyediaId,
 kuantitas,
 item.harga_normal,
 item.harga_penawaran,
 item.nama,
 item.satuan,
],
 );
 await client.query(
 `UPDATE penawaran
 SET stok=stok-$1,
     versi=versi+1,
     status=CASE WHEN stok-$1=0 THEN 'habis' ELSE status END
 WHERE id=$2`,
 [kuantitas, item.id],
 );
 }
 await client.query(
 `UPDATE pesanan ps SET total_transaksi=r.total, nilai_stok_terselamatkan=r.nilai_stok
 FROM (SELECT SUM(subtotal) AS total, SUM(nilai_stok) AS nilai_stok
 FROM detail_pesanan WHERE pesanan_id=$1) r
 WHERE ps.id=$1`,
 [id],
 );
 return bacaDetail(id, client, pengguna);
 });
}
export async function konfirmasiPesanan(id, pengguna) {
  return transaksi(async (client) => {
    const scope = cakupan(pengguna);
    const cek = await client.query(
  `SELECT * FROM pesanan ps
   WHERE ps.id = $1 AND ${scope.kolom} = $2
   FOR UPDATE`,
  [id, scope.id],
);
    if (!cek.rowCount) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
    }
    if (cek.rows[0].status !== "menunggu-konfirmasi") {
  throw new HttpError(
    409,
    "ORDER_INVALID_STATUS",
    "Pesanan tidak dapat dibatalkan atau ditolak karena statusnya sudah berubah.",
  );
}
    await client.query(
      `UPDATE pesanan SET status = 'dikonfirmasi' WHERE id = $1`,
      [id]
    );
    return bacaDetail(id, client, pengguna);
  });
}

export async function siapPesanan(id, pengguna) {
  return transaksi(async (client) => {
    const scope = cakupan(pengguna);

    const cek = await client.query(
      `SELECT * FROM pesanan ps
       WHERE ps.id = $1 AND ${scope.kolom} = $2
       FOR UPDATE`,
      [id, scope.id],
    );

    if (!cek.rowCount) {
      throw new HttpError(
        404,
        "ORDER_NOT_FOUND",
        "Pesanan tidak ditemukan.",
      );
    }

    if (cek.rows[0].status !== "dikonfirmasi") {
      throw new HttpError(
        409,
        "ORDER_INVALID_STATUS",
        "Pesanan harus dikonfirmasi sebelum dinyatakan siap diambil.",
      );
    }

    const kode = buatKodePengambilan();

    await client.query(
      `INSERT INTO pengambilan (
         pesanan_id, kode, jadwal_pada, status
       )
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'terjadwal')`,
      [id, kode],
    );

    await client.query(
      `UPDATE pesanan
       SET status = 'siap-diambil',
           siap_pada = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id],
    );

    return bacaDetail(id, client, pengguna);
  });
}

export async function selesaiPesanan(id, pengguna, body) {
  return transaksi(async (client) => {
    const scope = cakupan(pengguna);

    const cek = await client.query(
      `SELECT * FROM pesanan ps
       WHERE ps.id = $1 AND ${scope.kolom} = $2
       FOR UPDATE`,
      [id, scope.id],
    );

    if (!cek.rowCount) {
      throw new HttpError(
        404,
        "ORDER_NOT_FOUND",
        "Pesanan tidak ditemukan.",
      );
    }

    const pesanan = cek.rows[0];

    if (pesanan.status !== "siap-diambil") {
      throw new HttpError(
        409,
        "ORDER_INVALID_STATUS",
        "Pesanan harus siap diambil sebelum dinyatakan selesai.",
      );
    }

    const berbayar = Number(pesanan.total_transaksi) > 0;

    if (berbayar && body?.pembayaranDiterima !== true) {
      throw new HttpError(
        400,
        "PAYMENT_NOT_CONFIRMED",
        "Pembayaran harus dikonfirmasi sebelum pesanan diselesaikan.",
      );
    }

    const cekPengambilan = await client.query(
      `SELECT id FROM pengambilan
       WHERE pesanan_id = $1
       FOR UPDATE`,
      [id],
    );

    if (!cekPengambilan.rowCount) {
      throw new HttpError(
        409,
        "PICKUP_NOT_SCHEDULED",
        "Data pengambilan pesanan tidak ditemukan.",
      );
    }

    await client.query(
      `UPDATE pesanan
       SET status = 'selesai',
           status_pembayaran = $1,
           dibayar_pada = CASE
             WHEN $2 THEN CURRENT_TIMESTAMP
             ELSE NULL
           END,
           selesai_pada = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [berbayar ? "dibayar" : "gratis", berbayar, id],
    );

    await client.query(
      `UPDATE pengambilan
       SET status = 'diambil',
           diambil_pada = CURRENT_TIMESTAMP
       WHERE pesanan_id = $1`,
      [id],
    );

    return bacaDetail(id, client, pengguna);
  });
}


export async function tolakPesanan(id, pengguna, body) {
  if (pengguna.peran !== "penyedia") {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya penyedia yang dapat menolak pesanan.",
    );
  }

  return transaksi(async (client) => {
    const scope = cakupan(pengguna);

    const cek = await client.query(
      `SELECT * FROM pesanan ps
       WHERE ps.id = $1 AND ${scope.kolom} = $2
       FOR UPDATE`,
      [id, scope.id],
    );

    if (!cek.rowCount) {
      throw new HttpError(
        404,
        "ORDER_NOT_FOUND",
        "Pesanan tidak ditemukan.",
      );
    }

    const pesanan = cek.rows[0];

    if (pesanan.status !== "menunggu-konfirmasi") {
      throw new HttpError(
        409,
        "ORDER_INVALID_STATUS",
        "Pesanan hanya dapat ditolak sebelum dikonfirmasi.",
      );
    }

    const items = await client.query(
      `SELECT penawaran_id, kuantitas
       FROM detail_pesanan
       WHERE pesanan_id = $1`,
      [id],
    );

    for (const item of items.rows) {
      await client.query(
        `UPDATE penawaran
         SET stok = stok + $1,
             versi = versi + 1,
             status = CASE
               WHEN berakhir_pada <= CURRENT_TIMESTAMP THEN 'kedaluwarsa'
               WHEN status = 'habis' THEN 'aktif'
               ELSE status
             END
         WHERE id = $2`,
        [item.kuantitas, item.penawaran_id],
      );
    }

    await client.query(
      `UPDATE pesanan
       SET status = 'dibatalkan',
           jenis_pembatalan = 'ditolak-penyedia',
           alasan_pembatalan = $1,
           dibatalkan_pada = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        body?.alasan || "Pesanan ditolak oleh penyedia",
        id,
      ],
    );

    return bacaDetail(id, client, pengguna);
  });
}


export async function batalPesanan(id, pengguna, body) {
  return transaksi(async (client) => {
    const scope = cakupan(pengguna);

    const cek = await client.query(
      `SELECT * FROM pesanan ps
       WHERE ps.id = $1 AND ${scope.kolom} = $2
       FOR UPDATE`,
      [id, scope.id],
    );

    if (!cek.rowCount) {
      throw new HttpError(
        404,
        "ORDER_NOT_FOUND",
        "Pesanan tidak ditemukan.",
      );
    }

    const pesanan = cek.rows[0];

    const statusDiizinkan =
      pengguna.peran === "pembeli"
        ? ["menunggu-konfirmasi"]
        : ["menunggu-konfirmasi", "dikonfirmasi", "siap-diambil"];

    if (!statusDiizinkan.includes(pesanan.status)) {
      throw new HttpError(
        409,
        "ORDER_INVALID_STATUS",
        "Pesanan tidak dapat dibatalkan karena statusnya sudah berubah.",
      );
    }

    const items = await client.query(
      `SELECT penawaran_id, kuantitas
       FROM detail_pesanan
       WHERE pesanan_id = $1`,
      [id],
    );

    for (const item of items.rows) {
      await client.query(
        `UPDATE penawaran
         SET stok = stok + $1,
             versi = versi + 1,
             status = CASE
               WHEN berakhir_pada <= CURRENT_TIMESTAMP THEN 'kedaluwarsa'
               WHEN status = 'habis' THEN 'aktif'
               ELSE status
             END
         WHERE id = $2`,
        [item.kuantitas, item.penawaran_id],
      );
    }

    if (pesanan.status === "siap-diambil") {
      await client.query(
        `UPDATE pengambilan
         SET status = 'gagal'
         WHERE pesanan_id = $1
           AND status = 'terjadwal'`,
        [id],
      );
    }

    const jenisPembatalan =
      pengguna.peran === "pembeli" ? "pembeli" : "penyedia";

    await client.query(
      `UPDATE pesanan
       SET status = 'dibatalkan',
           jenis_pembatalan = $1,
           alasan_pembatalan = $2,
           dibatalkan_pada = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        jenisPembatalan,
        body?.alasan || "Dibatalkan pengguna",
        id,
      ],
    );

    return bacaDetail(id, client, pengguna);
  });
}
