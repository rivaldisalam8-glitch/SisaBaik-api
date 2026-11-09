import { prosesFoto } from "../../src/lib/foto.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const BATAS_FOTO = 409600;

async function cadangkanFoto(data, database) {
  const folder = resolve(process.cwd(), "backups");
  await mkdir(folder, { recursive: true });

  const waktu = new Date().toISOString().replace(/[:.]/g, "-");
  const namaDatabaseAman = database.replace(/[^a-zA-Z0-9_-]/g, "_");
  const lokasi = resolve(
    folder,
    `foto-${namaDatabaseAman}-${waktu}.json`,
  );

  const isi = {
    database,
    tabel: "penawaran",
    dibuatPada: new Date().toISOString(),
    jumlahFoto: data.length,
    data,
  };

  await writeFile(lokasi, JSON.stringify(isi, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });

  const hasilBackup = JSON.parse(await readFile(lokasi, "utf8"));

  if (
    hasilBackup.database !== database ||
    hasilBackup.tabel !== "penawaran" ||
    hasilBackup.jumlahFoto !== data.length ||
    !Array.isArray(hasilBackup.data) ||
    hasilBackup.data.length !== data.length
  ) {
    throw new Error("Verifikasi backup foto gagal. Migrasi dihentikan.");
  }

  return lokasi;
}
async function hapusConstraintUkuranFoto(client) {
  const hasil = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) AS definisi
    FROM pg_constraint
    WHERE conrelid = 'public.penawaran'::regclass
      AND contype = 'c'
      AND conname IN (
        'penawaran_foto_check',
        'penawaran_foto_size_check'
      )
  `);

  for (const constraint of hasil.rows) {
    const definisi = constraint.definisi.toLowerCase().replace(/\s/g, "");

    const sesuai = definisi.includes("octet_length(foto)<=409600");

    if (!sesuai) {
      throw new Error(
        `Migrasi foto dihentikan: definisi constraint ${constraint.conname} tidak sesuai.`,
      );
    }

    await client.query(
      `ALTER TABLE public.penawaran DROP CONSTRAINT "${constraint.conname}"`,
    );
  }
}

async function rapikanConstraint(client) {
  const hasil = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) AS definisi
    FROM pg_constraint
    WHERE conrelid = 'public.penawaran'::regclass
      AND contype = 'c'
      AND conname IN (
        'penawaran_foto_check',
        'penawaran_foto_size_check'
      )
  `);

  for (const constraint of hasil.rows) {
    const definisi = constraint.definisi.toLowerCase().replace(/\s/g, "");

    const sesuai = definisi.includes("octet_length(foto)<=409600");

    if (!sesuai) {
      throw new Error(
        `Migrasi foto dihentikan: definisi constraint ${constraint.conname} tidak sesuai.`,
      );
    }

    if (constraint.conname === "penawaran_foto_check") {
      await client.query(
        `ALTER TABLE public.penawaran DROP CONSTRAINT "${constraint.conname}"`,
      );
    }
  }

  const adaConstraint = hasil.rows.some(
    (constraint) => constraint.conname === "penawaran_foto_size_check",
  );

  if (!adaConstraint) {
    await client.query(`
      ALTER TABLE public.penawaran
      ADD CONSTRAINT penawaran_foto_size_check
      CHECK (foto IS NULL OR octet_length(foto) <= ${BATAS_FOTO})
    `);
  }
}

export async function migrasiFotoBytea(client, database) {
  const kolom = await client.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'penawaran'
      AND column_name = 'foto'
  `);

  if (kolom.rows.length !== 1) {
    throw new Error("Migrasi foto dihentikan: kolom penawaran.foto tidak ditemukan.");
  }

  const tipe = kolom.rows[0].data_type;

  if (tipe === "bytea") {
    await rapikanConstraint(client);
    console.log("Kolom foto sudah BYTEA; konversi dilewati.");
    return { dikonversi: 0, backup: null };
  }

  if (tipe !== "text") {
    throw new Error(
      `Migrasi foto dihentikan: tipe kolom tidak didukung (${tipe}).`,
    );
  }

  const hasil = await client.query(`
    SELECT id, foto
    FROM public.penawaran
    WHERE foto IS NOT NULL AND foto <> ''
    ORDER BY id
  `);

  const konversi = [];

  for (const baris of hasil.rows) {
    try {
      const foto = await prosesFoto(baris.foto);

      konversi.push({
        id: baris.id,
        ...foto,
      });
    } catch (error) {
      throw new Error(
        `Foto pada penawaran ID ${baris.id} gagal divalidasi: ${error.message}`,
      );
    }
  }

  let lokasiBackup = null;

  if (hasil.rows.length > 0) {
    lokasiBackup = await cadangkanFoto(hasil.rows, database);
    console.log(`Backup foto lama: ${lokasiBackup}`);
  }

  await hapusConstraintUkuranFoto(client);

  await client.query(`
    ALTER TABLE public.penawaran
    ALTER COLUMN foto TYPE BYTEA
    USING NULL::BYTEA
  `);

  for (const foto of konversi) {
    await client.query(
      `UPDATE public.penawaran
       SET foto = $1, foto_hash = $2, foto_tipe = $3
       WHERE id = $4`,
      [foto.buffer, foto.hash, foto.tipe, foto.id],
    );
  }

  await rapikanConstraint(client);

  console.log(`Migrasi foto selesai: ${konversi.length} foto dikonversi.`);

  return {
    dikonversi: konversi.length,
    backup: lokasiBackup,
  };
}
