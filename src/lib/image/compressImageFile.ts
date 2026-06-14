const IMAGE_COMPRESSION_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;
const JPEG_QUALITY = 0.82;

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load image'));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });

export const compressImageFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );

    if (file.size <= IMAGE_COMPRESSION_THRESHOLD_BYTES && scale === 1) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas);

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const fileName = file.name.replace(/\.[^.]+$/, '') || 'smart-import-image';

    return new File([blob], `${fileName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.warn('Smart import image compression failed:', error);

    return file;
  }
};
