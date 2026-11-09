import * as service from "../services/pesanan.js";
import { HttpError, idValid, halamanValid } from "../lib/api.js";
import { pesananSesiValid } from "../lib/input-auth.js";
export async function daftar(req, res) {
 const hasil = await service.daftarPesanan(
 halamanValid(req.query),
 req.pengguna,
 );
 return res.json({ success: true, ...hasil });
}
export async function detail(req, res) {
 const hasil = await service.detailPesanan(
 idValid(req.params.id),
 req.pengguna,
 );
 return res.json({ success: true, data: hasil });
}
export async function buat(req, res) {
  const data = pesananSesiValid(req.body, req.pengguna);
  const hasil = await service.buatPesanan(data, req.pengguna);
  return res.status(201).json({ success: true, data: hasil });
}

export async function konfirmasi(req, res) {
  const hasil = await service.konfirmasiPesanan(
    idValid(req.params.id),
    req.pengguna
  );
  return res.json({ success: true, data: hasil });
}

export async function siap(req, res) {
  const hasil = await service.siapPesanan(
    idValid(req.params.id),
    req.pengguna
  );
  return res.json({ success: true, data: hasil });
}

export async function selesai(req, res) {
  const hasil = await service.selesaiPesanan(
    idValid(req.params.id),
    req.pengguna,
    req.body
  );
  return res.json({ success: true, data: hasil });
}

export async function batal(req, res) {
  const hasil = await service.batalPesanan(
    idValid(req.params.id),
    req.pengguna,
    req.body
  );
  return res.json({ success: true, data: hasil });
}

export async function tolak(req, res) {
  const hasil = await service.tolakPesanan(
    idValid(req.params.id),
    req.pengguna,
    req.body
  );
  return res.json({ success: true, data: hasil });
}

export async function aksi(req, res) {
  const { aksi, ...body } = req.body;
  let hasil;
  const id = idValid(req.params.id);

  // Ubah ke huruf kecil untuk menghindari perbedaan penulisan
  const jenisAksi = String(aksi || "").toLowerCase();
  const aksiKhususPenyedia = [
  "konfirmasi",
  "terima",
  "siap",
  "tanda-siap",
  "siap-diambil",
  "selesai",
  "serah-terima",
  "tolak",
];

if (
  aksiKhususPenyedia.includes(jenisAksi) &&
  req.pengguna.peran !== "penyedia"
) {
  throw new HttpError(
    403,
    "ROLE_FORBIDDEN",
    "Aksi ini hanya dapat dilakukan oleh penyedia."
  );
}

  if (jenisAksi === "konfirmasi" || jenisAksi === "terima") {
    hasil = await service.konfirmasiPesanan(id, req.pengguna);
  } else if (jenisAksi === "siap" || jenisAksi === "tanda-siap" || jenisAksi === "siap-diambil") {
    hasil = await service.siapPesanan(id, req.pengguna);
  } else if (jenisAksi === "selesai" || jenisAksi === "serah-terima") {
    hasil = await service.selesaiPesanan(id, req.pengguna, body);
  } else if (jenisAksi === "batal") {
    hasil = await service.batalPesanan(id, req.pengguna, body);
  } else if (jenisAksi === "tolak") {
    hasil = await service.tolakPesanan(id, req.pengguna, body);
  } else {
    throw new HttpError(400, "INVALID_ACTION", `Aksi tidak dikenali: ${aksi}`);
  }

  return res.json({ success: true, data: hasil });
}