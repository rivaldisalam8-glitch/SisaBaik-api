
import { prosesFoto } from "../lib/foto.js";
import { pool } from "../db/pool.js";
import { transaksi } from "../db/transaksi.js";
import { HttpError, metaHalaman } from "../lib/api.js";


const kolom = `p.id, p.penyedia_id, py.nama_usaha AS penyedia,
 p.nama, p.kategori, p.harga_normal, p.harga_penawaran,
 p.stok, p.satuan, p.status, p.berakhir_pada, p.dibuat_pada,
 p.foto, p.versi, p.foto_hash, p.foto_tipe`;

const gabung = `FROM penawaran p
 JOIN penyedia py ON py.id=p.penyedia_id
 JOIN pengguna pemilik ON pemilik.id=py.pengguna_id`;

export function kePenawaran(row) {
  return {
    id: String(row.id),
    penyediaId: String(row.penyedia_id),
    penyedia: row.penyedia,
    nama: row.nama,
    kategori: row.kategori,
    hargaNormal: Number(row.harga_normal),
    hargaPenawaran: Number(row.harga_penawaran),
    stok: row.stok,
    satuan: row.satuan,
    status: row.status,
    berakhirPada: new Date(row.berakhir_pada).toISOString(),
    dibuatPada: new Date(row.dibuat_pada).toISOString(),
    fotoUrl: row.foto_hash
      ? `/api/penawaran/${row.id}/foto`
      : null,
    versi: String(row.versi),
  };
}
export async function bacaPenawaran(id, db = pool, publik = false) {
  const hasil = await db.query(
    `SELECT ${kolom} ${gabung}
     WHERE p.id=$1
     AND (
       NOT $2::boolean
       OR (
         p.status='aktif'
         AND p.stok>0
         AND p.berakhir_pada>CURRENT_TIMESTAMP
         AND pemilik.aktif=TRUE
         AND pemilik.peran='penyedia'
         AND py.status_verifikasi='terverifikasi'
       )
     )`,
    [id, publik],
  );

  if (!hasil.rowCount) {
    throw new HttpError(
      404,
      "OFFER_NOT_FOUND",
      "Penawaran tidak ditemukan.",
    );
  }

  return kePenawaran(hasil.rows[0]);
}

export async function bacaFotoPenawaran(id) {
  const hasil = await pool.query(
    `SELECT foto, foto_tipe
     FROM penawaran
     WHERE id=$1 AND foto IS NOT NULL`,
    [id],
  );

  if (!hasil.rowCount) {
    throw new HttpError(
      404,
      "PHOTO_NOT_FOUND",
      "Foto penawaran tidak ditemukan.",
    );
  }

  return hasil.rows[0];
}

export function daftarPenawaran(filter, paging, pemilikId = null) {
  return transaksi(async (client) => {
    const where = `WHERE ($1::text = '' OR
      POSITION(LOWER($1) IN LOWER(p.nama || ' ' || py.nama_usaha)) > 0)
      AND ($2::text = '' OR p.kategori = $2)
      AND ($3::text = '' OR p.status = $3)
      AND (
        NOT $4::boolean
        OR (
          p.status = 'aktif'
          AND p.stok > 0
          AND p.berakhir_pada>CURRENT_TIMESTAMP
          AND pemilik.aktif=TRUE
          AND pemilik.peran='penyedia'
          AND py.status_verifikasi='terverifikasi'
        )
      )
      AND ($5::bigint IS NULL OR p.penyedia_id=$5)`;

    const nilai = [
      filter.q,
      filter.kategori,
      filter.status,
      filter.tersedia,
      pemilikId,
    ];

    const count = await client.query(
      `SELECT COUNT(*)::int AS jumlah ${gabung} ${where}`,
      nilai,
    );

    const hasil = await client.query(
      `SELECT ${kolom} ${gabung} ${where}
       ORDER BY p.id DESC
       LIMIT $6 OFFSET $7`,
      [...nilai, paging.limit, paging.offset],
    );

    return {
      data: hasil.rows.map(kePenawaran),
      meta: {
        ...metaHalaman(count.rows[0].jumlah, paging),
        ...filter,
      },
    };
  }, true);
}

export async function simpanPenawaran(data, id = null) {
  let gambarBaru = null;

  if (data.foto !== undefined && data.foto !== null) {
    gambarBaru = await prosesFoto(data.foto);
  }

  return transaksi(async (client) => {
    if (id !== null) {
      if (data.versi === undefined) {
        throw new HttpError(
          400,
          "VERSION_REQUIRED",
          "Versi penawaran wajib dikirim saat mengedit.",
        );
      }

      const lama = await client.query(
        `SELECT *
         FROM penawaran
         WHERE id=$1 AND penyedia_id=$2
         FOR UPDATE`,
        [id, data.penyediaId],
      );

      if (!lama.rowCount) {
        throw new HttpError(
          404,
          "OFFER_NOT_FOUND",
          "Penawaran tidak ditemukan.",
        );
      }

      const row = lama.rows[0];

      if (String(row.versi) !== data.versi) {
        throw new HttpError(
          409,
          "OFFER_VERSION_CONFLICT",
          "Penawaran telah berubah. Muat ulang data sebelum mengedit.",
        );
      }

      if (Number(row.stok) !== data.stok) {
        throw new HttpError(
          409,
          "OFFER_STOCK_CONFLICT",
          "Stok telah berubah akibat transaksi. Muat ulang data sebelum mengedit.",
        );
      }
    }

    const penyedia = await client.query(
      `SELECT py.id
       FROM penyedia py
       JOIN pengguna u ON u.id=py.pengguna_id
       WHERE py.id=$1
       AND u.peran='penyedia'
       AND u.aktif=TRUE
       AND py.status_verifikasi='terverifikasi'`,
      [data.penyediaId],
    );

    if (!penyedia.rowCount) {
      throw new HttpError(
        404,
        "PROVIDER_NOT_FOUND",
        "Penyedia aktif tidak ditemukan.",
      );
    }

    if (id === null) {
      const hasil = await client.query(
        `INSERT INTO penawaran (
          penyedia_id, nama, kategori, harga_normal,
          harga_penawaran, stok, satuan, status,
          berakhir_pada, foto, foto_hash, foto_tipe
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id`,
        [
          data.penyediaId,
          data.nama,
          data.kategori,
          data.hargaNormal,
          data.hargaPenawaran,
          data.stok,
          data.satuan,
          data.status,
          data.berakhirPada,
          gambarBaru?.buffer ?? null,
          gambarBaru?.hash ?? null,
          gambarBaru?.tipe ?? null,
        ],
      );

      return bacaPenawaran(hasil.rows[0].id, client);
    }

    const fotoDisediakan = data.foto !== undefined;

    const hasil = await client.query(
      `UPDATE penawaran
       SET nama=$3,
           kategori=$4,
           harga_normal=$5,
           harga_penawaran=$6,
           stok=$7,
           satuan=$8,
           status=$9,
           berakhir_pada=$10,
           foto=CASE WHEN $11 THEN $12::bytea ELSE foto END,
           foto_hash=CASE WHEN $11 THEN $13::varchar ELSE foto_hash END,
           foto_tipe=CASE WHEN $11 THEN $14::varchar ELSE foto_tipe END,
           versi=versi+1
       WHERE id=$1 AND penyedia_id=$2
       RETURNING id`,
      [
        id,
        data.penyediaId,
        data.nama,
        data.kategori,
        data.hargaNormal,
        data.hargaPenawaran,
        data.stok,
        data.satuan,
        data.status,
        data.berakhirPada,
        fotoDisediakan,
        gambarBaru?.buffer ?? null,
        gambarBaru?.hash ?? null,
        gambarBaru?.tipe ?? null,
      ],
    );

    return bacaPenawaran(hasil.rows[0].id, client);
  });
}

export async function hapusPenawaran(id, penyediaId) {
  const hasil = await pool.query(
    `DELETE FROM penawaran
     WHERE id=$1 AND penyedia_id=$2
     RETURNING id`,
    [id, penyediaId],
  );

  if (!hasil.rowCount) {
    throw new HttpError(
      404,
      "OFFER_NOT_FOUND",
      "Penawaran tidak ditemukan.",
    );
  }
}
