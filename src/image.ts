/**
 * 上传前压缩照片。
 *
 * 手机原图动辄 3~8MB，直接塞进 IndexedDB 很快就把本机空间吃满
 * （导出备份时还要 base64 一遍，体积再涨 1/3）。
 * 这里统一把长边缩到 MAX_EDGE 以内、再按 JPEG 重编码。
 */

/** 长边最大像素：1600 足够看清菜品细节，也能覆盖手机 3x 屏全屏查看 */
export const PHOTO_MAX_EDGE = 1600;

/** JPEG 质量，0~1 */
export const PHOTO_QUALITY = 0.82;

/** 已经足够小的图不再二次压缩，避免白白掉画质 */
const SKIP_BELOW_BYTES = 240 * 1024;

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/** 解出可绘制的图源；优先 createImageBitmap（顺便按 EXIF 方向摆正） */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // 个别浏览器/格式不支持这个选项，退回 <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/** 缩放绘制并编码成 JPEG */
async function resizeToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const paint = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => {
    // JPEG 没有透明通道，先铺白底，避免 PNG 透明处变黑
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
  };

  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      paint(ctx);
      return canvas.convertToBlob({ type: 'image/jpeg', quality });
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * 压缩一张照片。无法处理（非图片、动图、解码失败）时原样返回，不阻断添加流程。
 * 如果压完反而更大（原图本身就是高度优化过的小图），同样保留原图。
 */
export async function compressPhoto(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  const maxEdge = options.maxEdge ?? PHOTO_MAX_EDGE;
  const quality = options.quality ?? PHOTO_QUALITY;

  // 动图/矢量图不转 JPEG，否则会丢动画或失真
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  const decoded = await decode(file);
  try {
    const { width, height } = decoded;
    const longest = Math.max(width, height);
    if (!longest) return file;

    const scale = longest > maxEdge ? maxEdge / longest : 1;
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const compressed = await resizeToJpeg(decoded.source, targetWidth, targetHeight, quality);
    if (!compressed) return file;
    return compressed.size < file.size ? compressed : file;
  } finally {
    decoded.release();
  }
}
