// Turns a picked image file into a small WebP data URI in the browser, BEFORE it is
// sent to the server. A logo straight from a camera / design tool is often 1-3 MB;
// as base64 inside a JSON body that is larger than the API accepts (HTTP 413).
// A logo / favicon never needs more than a few hundred pixels: scaled down and
// encoded as WebP it is typically 5-40 KB and keeps its transparency.
//
//   imageFileToWebpDataUrl(file, { maxSize: 512 })   // school logo
//   imageFileToWebpDataUrl(file, { maxSize: 128 })   // favicon
//
// Falls back to the browser's PNG if it cannot encode WebP (the result is still
// scaled down, so still small).

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be read as an image'));
    img.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the converted image'));
    reader.readAsDataURL(blob);
  });
}

export async function imageFileToWebpDataUrl(file, { maxSize = 512, quality = 0.86 } = {}) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    if (!width || !height) {
      // an SVG without an intrinsic size
      width = maxSize;
      height = maxSize;
    }
    const isVector = file.type === 'image/svg+xml';
    // never enlarge a bitmap; a vector is drawn at the target size
    const scale = isVector ? maxSize / Math.max(width, height) : Math.min(1, maxSize / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // keep transparency
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) throw new Error('Unable to convert the image');
    return await blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default imageFileToWebpDataUrl;
