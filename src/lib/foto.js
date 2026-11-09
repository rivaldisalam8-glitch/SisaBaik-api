import { createHash } from "node:crypto";
import sharp from "sharp";
import { HttpError } from "./api.js";

const BATAS_FOTO = 409600;

export async function prosesFoto(dataUrl) {
  const cocok = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    dataUrl,
  );

  if (!cocok) {
    throw new HttpError(
      400,
      "INVALID_IMAGE",
      "Foto harus berupa data URL PNG, JPEG, atau WebP yang valid.",
    );
  }

  const buffer = Buffer.from(cocok[2], "base64");

  if (
    buffer.length === 0 ||
    buffer.toString("base64") !== cocok[2]
  ) {
    throw new HttpError(
      400,
      "INVALID_IMAGE",
      "Data foto tidak valid.",
    );
  }

  try {
    const gambar = sharp(buffer, {
      failOn: "error",
      limitInputPixels: 40000000,
    });

    const metadata = await gambar.metadata();

    if (!["png", "jpeg", "webp"].includes(metadata.format)) {
      throw new Error("Format gambar tidak didukung.");
    }

    const hasil = await gambar
      .rotate()
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    if (hasil.length > BATAS_FOTO) {
      throw new HttpError(
        400,
        "IMAGE_TOO_LARGE",
        "Ukuran foto setelah diproses melebihi 400 KB.",
      );
    }

    return {
      buffer: hasil,
      hash: createHash("sha256").update(hasil).digest("hex"),
      tipe: "image/webp",
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;

    throw new HttpError(
      400,
      "INVALID_IMAGE",
      "Berkas foto tidak valid atau tidak dapat diproses.",
    );
  }
}
