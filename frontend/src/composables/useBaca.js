import { ref } from 'vue';

export function useBaca(panggilApi) {
  const data = ref(null);
  const sibuk = ref(false);
  const error = ref(null);

  let controller = null;

  const batalkan = () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
  };

  const muat = async () => {
    batalkan();
    controller = new AbortController();
    sibuk.value = true;
    error.value = null;

    try {
      const hasil = await panggilApi(controller.signal);
      data.value = hasil;
    } catch (err) {
      if (err.name !== 'AbortError') {
        error.value = err.message || 'Gagal memuat data';
      }
    } finally {
      sibuk.value = false;
    }
  };

  return {
    data,
    sibuk,
    error,
    muat,
    batalkan, // <-- Pastikan batalkan diekspor di sini agar tidak ReferenceError
  };
}