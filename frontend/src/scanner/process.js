export const limits = {
  bytes: 10 * 1024 * 1024,
  pages: 5,
  pixels: 4_000_000,
  imagePixels: 20_000_000,
  text: 100_000,
};
const abortError = () => new DOMException("Cancelled", "AbortError");

// Tesseract 7 creates its native worker synchronously but only exposes it after
// WASM/language initialization. Capture that handle during this synchronous call
// so cancel/error can terminate even a stalled initialization. No await occurs
// while the constructor is wrapped; the global is restored before returning.
function startOCR(createWorker, options, onSpawn) {
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, workerOptions) {
      super(url, workerOptions);
      if (String(url) === options.workerPath) onSpawn(this);
    }
  };
  try {
    return createWorker("eng", 1, options);
  } finally {
    window.Worker = NativeWorker;
  }
}
export async function validateFile(file) {
  if (!file || file.size === 0 || file.size > limits.bytes)
    throw new Error("Choose a non-empty file up to 10 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pdf = String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const kind = pdf ? "pdf" : png ? "png" : jpeg ? "jpeg" : null;
  if (
    !kind ||
    !{ pdf: /\.pdf$/i, png: /\.png$/i, jpeg: /\.jpe?g$/i }[kind].test(file.name)
  )
    throw new Error("File content must match its PDF, PNG or JPG extension.");
  return kind;
}

async function checkImageDimensions(file, kind) {
  // Inspect headers before asking the decoder to allocate a potentially huge bitmap.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let width, height;
  if (kind === "png" && bytes.length >= 24) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (kind === "jpeg") {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 255) {
        offset++;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset + 2);
      if (length < 2) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = view.getUint16(offset + 5);
        width = view.getUint16(offset + 7);
        break;
      }
      offset += length + 2;
    }
  }
  if (!width || !height) throw new Error("Unreadable image header");
  if (width * height > limits.imagePixels)
    throw new Error("Image is too large. Resize it below 20 megapixels.");
}

export async function processDocument(file, { signal, progress = () => {} }) {
  let worker, nativeWorker, loadingTask, renderTask, canvas, bitmap;
  let workerPromise;
  const abortable = (promise) =>
    new Promise((resolve, reject) => {
      const cancel = () => reject(abortError());
      signal.addEventListener("abort", cancel, { once: true });
      promise
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", cancel));
      if (signal.aborted) cancel();
    });
  const check = () => {
    if (signal.aborted) throw abortError();
  };
  const dispose = () => {
    renderTask?.cancel();
    void loadingTask?.destroy().catch(() => {});
    if (worker) {
      void worker.terminate();
      worker = null;
    }
    nativeWorker?.terminate();
    nativeWorker = null;
  };
  signal.addEventListener("abort", dispose, { once: true });
  const assets = new URL(
    `${import.meta.env.BASE_URL}scanner-assets/`,
    window.location.origin,
  ).href;
  async function ocr(image) {
    check();
    if (!worker) {
      progress("Loading on-device English OCR…");
      const { createWorker } = await import("tesseract.js");
      check();
      let rejectInitialization;
      const initializationError = new Promise((_, reject) => {
        rejectInitialization = reject;
      });
      workerPromise = startOCR(
        createWorker,
        {
          workerPath: `${assets}worker.min.js`,
          corePath: assets,
          langPath: assets,
          workerBlobURL: false,
          cacheMethod: "none",
          logger: (m) => {
            if (!signal.aborted && m.status === "recognizing text")
              progress(`Reading text: ${Math.round(m.progress * 100)}%`);
          },
          // Tesseract does not reject createWorker for every language/init failure.
          errorHandler: () =>
            rejectInitialization(new Error("OCR initialization failed")),
        },
        (handle) => {
          nativeWorker = handle;
        },
      );
      worker = await abortable(
        Promise.race([workerPromise, initializationError]),
      );
      check();
    }
    const { data } = await abortable(worker.recognize(image));
    check();
    if (data.text.length > limits.text)
      throw new Error("Document text limit exceeded");
    return data.text;
  }
  try {
    check();
    const kind = await validateFile(file);
    check();
    if (kind !== "pdf") {
      await checkImageDimensions(file, kind);
      check();
      bitmap = await createImageBitmap(file);
      check();
      if (bitmap.width * bitmap.height > limits.imagePixels)
        throw new Error("Image is too large. Resize it below 20 megapixels.");
      canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        Math.sqrt(limits.pixels / (bitmap.width * bitmap.height)),
      );
      canvas.width = Math.max(1, Math.floor(bitmap.width * scale));
      canvas.height = Math.max(1, Math.floor(bitmap.height * scale));
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return [{ page: 1, method: "ocr", text: await ocr(canvas) }];
    }
    const pdfjs = await import("pdfjs-dist");
    const { default: workerUrl } = await import(
      "pdfjs-dist/build/pdf.worker.min.mjs?url"
    );
    check();
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const bytes = new Uint8Array(await file.arrayBuffer());
    check();
    loadingTask = pdfjs.getDocument({
      data: bytes,
      isEvalSupported: false,
      stopAtErrors: true,
      verbosity: 0,
      cMapUrl: `${assets}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${assets}standard_fonts/`,
      wasmUrl: `${assets}wasm/`,
      maxImageSize: limits.imagePixels,
    });
    const pdf = await loadingTask.promise;
    check();
    if (pdf.numPages > limits.pages)
      throw new Error("Use a PDF with at most 5 pages.");
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      check();
      progress(`Reading page ${i} of ${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      check();
      let lastY;
      const text = content.items
        .map((item) => {
          const y = item.transform?.[5];
          const newline = lastY !== undefined && Math.abs(y - lastY) > 3;
          lastY = y;
          return `${newline ? "\n" : ""}${item.str || ""}${item.hasEOL ? "\n" : " "}`;
        })
        .join("");
      if (text.length > limits.text)
        throw new Error("Document text limit exceeded");
      // Sparse text may be only a scanner watermark; OCR that page instead.
      if ((text.match(/[a-zA-Z]/g) || []).length >= 40)
        pages.push({ page: i, method: "pdf", text });
      else {
        const unit = page.getViewport({ scale: 1 });
        const scale = Math.min(
          2,
          Math.sqrt(limits.pixels / (unit.width * unit.height)),
        );
        const viewport = page.getViewport({ scale });
        canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        });
        await renderTask.promise;
        renderTask = null;
        check();
        pages.push({ page: i, method: "ocr", text: await ocr(canvas) });
        canvas.width = canvas.height = 0;
        canvas = null;
      }
      page.cleanup();
    }
    return pages;
  } catch (error) {
    if (signal.aborted) throw abortError();
    // Do not retain library error objects: they can contain fragments of document data.
    if (error.name === "PasswordException")
      // eslint-disable-next-line preserve-caught-error
      throw new Error(
        "This PDF is password protected. Use an unlocked copy or manual entry.",
      );
    if (/Choose a|File content|too large|at most/.test(error.message))
      throw error;
    // eslint-disable-next-line preserve-caught-error
    throw new Error(
      "Could not read this document. It may be damaged, empty, or too difficult to read. Try a clearer copy or manual entry.",
    );
  } finally {
    signal.removeEventListener("abort", dispose);
    dispose();
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}
