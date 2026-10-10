import { useMemo } from 'react';
import type { Photo } from '../types';

/**
 * 会话级 objectURL 缓存：同一张照片（key）复用同一个 URL。
 * 不随组件卸载立即 revoke，避免图片加载进行中被释放导致 ERR_FILE_NOT_FOUND；
 * 本地应用照片数量有限，按模块生命周期保留即可。
 */
const urlCache = new Map<string, string>();

function urlFor(photo: Photo): string {
  const cached = urlCache.get(photo.key);
  if (cached !== undefined) return cached;
  const url = URL.createObjectURL(photo.blob);
  urlCache.set(photo.key, url);
  return url;
}

interface Props {
  photo: Photo;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

/**
 * 将图片 Blob 转为 objectURL 并渲染；同一 key 复用同一 URL。
 */
export default function PhotoImg({ photo, className, alt = '', onClick }: Props) {
  const url = useMemo(() => urlFor(photo), [photo]);
  return <img src={url} alt={alt} className={className} onClick={onClick} loading="lazy" />;
}