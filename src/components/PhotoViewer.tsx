import { useCallback, useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import PhotoImg from './PhotoImg';
import type { Photo } from '../types';

interface Props {
  photos: Photo[];
  index: number;
  name: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * 全屏看图：深色背景铺满屏幕。
 * 点按图片 / 空白处 / × / Esc 关闭；多图时支持左右箭头、方向键与滑动切换。
 */
export default function PhotoViewer({ photos, index, name, onIndexChange, onClose }: Props) {
  const total = photos.length;
  const current = photos[index];
  // 触摸起点与"本次触摸是否已判定为滑动"（滑动后抑制随后的点击，避免误关闭）
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (step: number) => {
      if (total < 2) return;
      onIndexChange((index + step + total) % total);
    },
    [index, total, onIndexChange],
  );

  // 捕获阶段监听：Esc 关闭时拦截事件，避免同时触发下层详情浮层的 Esc 关闭
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.stopPropagation();
        go(-1);
      } else if (e.key === 'ArrowRight') {
        e.stopPropagation();
        go(1);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [go, onClose]);

  if (!current) return null;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    swiped.current = false;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // 横向位移需足够大，且明显大于纵向位移（避免误伤手势）
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    swiped.current = true;
    go(dx < 0 ? 1 : -1);
  };

  const handleTap = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onClose();
  };

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} · 全屏看图`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" className="viewer-close" onClick={onClose} aria-label="退出全屏">
        ×
      </button>

      {total > 1 && (
        <button
          type="button"
          className="viewer-nav viewer-prev"
          onClick={() => go(-1)}
          aria-label="上一张"
        >
          ‹
        </button>
      )}

      <div className="viewer-stage" onClick={handleTap}>
        <PhotoImg photo={current} className="viewer-img" alt={`${name} 第 ${index + 1} 张`} />
      </div>

      {total > 1 && (
        <button
          type="button"
          className="viewer-nav viewer-next"
          onClick={() => go(1)}
          aria-label="下一张"
        >
          ›
        </button>
      )}

      {total > 1 && (
        <div className="viewer-count">
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
}
