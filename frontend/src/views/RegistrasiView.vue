<script setup>
import { ref, nextTick, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api, pesanError } from "../lib/api.js";
import { periksaRegistrasi } from "../lib/registrasi.js";
import Ikon from "../components/Ikon.vue";

const router = useRouter();
const route = useRoute();

const form = ref({
  peran: route.query.peran === "penyedia" ? "penyedia" : "pembeli",
  namaLengkap: "",
  email: "",
  kataSandi: "",
  konfirmasiSandi: "",
  namaUsaha: "",
  alamat: "",
  nomorTelepon: "",
});

const errors = ref({});
const sibuk = ref(false);
const error = ref("");
const akunBaru = ref(null);
const ringkasan = ref(null);
const selesai = ref(null);
const lihatSandi = ref(false);

const controller = new AbortController();
onUnmounted(() => controller.abort());

async function daftar() {
  if (sibuk.value) return;
  error.value = "";
  errors.value = periksaRegistrasi(form.value);
  if (Object.keys(errors.value).length) {
    await nextTick();
    ringkasan.value?.focus();
    return;
  }
  const body = {
    namaLengkap: form.value.namaLengkap.trim(),
    email: form.value.email.trim(),
    kataSandi: form.value.kataSandi,
  };
  if (form.value.peran === "penyedia") {
    Object.assign(body, {
      namaUsaha: form.value.namaUsaha.trim(),
      alamat: form.value.alamat.trim(),
      nomorTelepon: form.value.nomorTelepon.trim(),
    });
  }
  sibuk.value = true;
  try {
    const hasil = await api(
      form.value.peran === "penyedia"
        ? "/api/auth/registrasi-penyedia"
        : "/api/auth/registrasi",
      { method: "POST", body, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    akunBaru.value = hasil.data;
    form.value.kataSandi = "";
    form.value.konfirmasiSandi = "";
    lihatSandi.value = false;
    await nextTick();
    selesai.value?.focus();
  } catch (e) {
    if (e.name !== "AbortError") {
      error.value =
        e.status === 409
          ? "Pendaftaran tidak dapat diproses. Jika pernah mendaftar, coba login dengan email tersebut."
          : e.status === 0
          ? "Koneksi bermasalah. Periksa koneksi dan coba kembali. Jika akun sudah terbentuk, gunakan halaman login."
          : e.message || "Pendaftaran belum berhasil. Silakan coba kembali.";
      await nextTick();
      ringkasan.value?.focus();
    }
  } finally {
    sibuk.value = false;
  }
}
</script>

<template>
  <section class="container workspace section" aria-labelledby="judul-daftar">
    <div class="page-heading">
      <div>
        <p class="eyebrow"><Ikon nama="pengguna" />Bergabung dengan SisaBaik</p>
        <h1 id="judul-daftar">Daftar Akun Baru</h1>
        <p class="muted">Pilih peran sebagai pembeli atau penyedia makanan.</p>
      </div>
    </div>

    <!-- Tampilkan form pendaftaran dan hasil sukses di sini sesuai modul -->
    <div v-if="akunBaru" ref="selesai" tabindex="-1" class="notice notice-success">
      <p>Pendaftaran berhasil! Silakan <RouterLink to="/login">login</RouterLink> menggunakan akun Anda.</p>
    </div>

    <form v-else @submit.prevent="daftar" novalidate>
      <!-- Contoh input ringkas, sesuaikan dengan file lengkap panduan praktikum -->
      <div>
        <label>Peran Akun</label>
        <select v-model="form.peran">
          <option value="pembeli">Pembeli</option>
          <option value="penyedia">Penyedia Makanan</option>
        </select>
      </div>
      <div>
        <label>Nama Lengkap</label>
        <input v-model.trim="form.namaLengkap" type="text" required />
      </div>
      <div>
        <label>Email</label>
        <input v-model.trim="form.email" type="email" required />
      </div>
      <div>
        <label>Kata Sandi</label>
        <input v-model="form.kataSandi" type="password" required />
      </div>
      <div>
        <label>Konfirmasi Kata Sandi</label>
        <input v-model="form.konfirmasiSandi" type="password" required />
      </div>

      <button type="submit" :disabled="sibuk">
        {{ sibuk ? "Memproses..." : "Daftar Sekarang" }}
      </button>
    </form>
  </section>
</template>