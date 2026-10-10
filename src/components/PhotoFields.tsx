import { useRef, useState } from 'react';
import type { Photo } from '../types';
import { compressPhoto } from '../image';
import PhotoImg from './PhotoImg';

interface Props {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 照片选择：相册多选 + 拍照（移动端 capture 调起相机，桌面端为普通文件选择）。
 * 选中的照片会先压缩再交给上层，避免手机原图把本地空间吃满。
 */
export default function PhotoFields({ photos, onChange }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setBusy(true);
    setNote(`正在压缩 ${list.length} 张照片…`);

    const added: Photo[] = [];
    let beforeBytes = 0;
    let afterBytes = 0;
    try {
      // 一张一张来：手机原图解码后很占内存，串行处理峰值最低
      for (const file of list) {
        beforeBytes += file.size;
        let blob: Blob = file;
        try {
          blob = await compressPhoto(file);
        } catch {
          blob = file; // 解码失败就存原图，别把添加流程卡死
        }
        afterBytes += blob.size;
        added.push({ key: crypto.randomUUID(), blob });
      }
    } finally {
      onChange([...photos, ...added]);
      setBusy(false);
      setNote(
        added.length === 0
          ? null
          : afterBytes < beforeBytes
            ? `已压缩 ${added.length} 张：${mb(beforeBytes)} → ${mb(afterBytes)}`
            : `已添加 ${added.length} 张照片`,
      );
    }
  };

  const remove = (key: string) => {
    onChange(photos.filter((p) => p.key !== key));
  };

  const pick = (input: HTMLInputElement | null) => {
    if (busy) return;
    input?.click();
  };

  return (
    <>
      <div className="photo-grid">
        {photos.map((p) => (
          <div className="photo-cell" key={p.key}>
            <PhotoImg photo={p} className="photo-thumb" alt="菜品照片" />
            <button
              type="button"
              className="photo-del"
              onClick={() => remove(p.key)}
              aria-label="删除照片"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="photo-add"
          onClick={() => pick(galleryRef.current)}
          disabled={busy}
        >
          <span className="photo-add-icon">＋</span>
          <span>相册</span>
        </button>
        <button
          type="button"
          className="photo-add"
          onClick={() => pick(camRef.current)}
          disabled={busy}
        >
          <span className="photo-add-icon">📷</span>
          <span>拍照</span>
        </button>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {note && <p className={busy ? 'photo-note working' : 'photo-note'}>{note}</p>}
    </>
  );
}
