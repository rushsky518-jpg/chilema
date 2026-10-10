import { useMemo, useRef, useState } from 'react';
import type { Dish } from '../types';
import DishCard from '../components/DishCard';
import { useDishes } from '../store';
import { backupFileName, exportBackupFile } from '../backup';

interface Props {
  onOpenDetail: (id: number) => void;
  onOpenNew: () => void;
}

/**
 * 菜库：搜索 + 列表 + 备份入口。
 */
export default function ListPage({ onOpenDetail, onOpenNew }: Props) {
  const { dishes, loading, backupJson, restoreFromJson } = useDishes();
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const t = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!t) return dishes;
    return dishes.filter(
      (d: Dish) =>
        d.name.toLowerCase().includes(t) ||
        d.ingredients.some((i) => i.toLowerCase().includes(t)),
    );
  }, [dishes, t]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const handleExport = async () => {
    try {
      const json = await backupJson();
      showToast(await exportBackupFile(json, backupFileName()));
    } catch (e) {
      showToast('备份失败：' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const json = await file.text();
      const parsed = JSON.parse(json) as { app?: unknown; dishes?: unknown };
      if (parsed.app !== 'chilema' || !Array.isArray(parsed.dishes)) {
        throw new Error('不是「吃了吗」的备份文件');
      }
      if (!window.confirm('将把备份中的菜合并进菜库（已存在的自动跳过），确定导入？')) return;
      const added = await restoreFromJson(json);
      showToast(added > 0 ? `导入完成，新增 ${added} 道菜 🎉` : '没有新增的菜（原备份都已存在）');
    } catch (e) {
      showToast('导入失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const renderEmpty = (icon: string, title: string, desc: string) => (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {!t && (
        <button type="button" className="btn btn-primary" onClick={onOpenNew}>
          记下第一道菜
        </button>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="search-row">
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          className="search-input"
          type="search"
          placeholder="搜索菜名或配料…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="搜索菜名或配料"
        />
        <div className="backup-actions">
          <button
            type="button"
            className="icon-btn"
            title="导出备份"
            aria-label="导出备份"
            onClick={handleExport}
          >
            📤
          </button>
          <button
            type="button"
            className="icon-btn"
            title="导入备份"
            aria-label="导入备份"
            onClick={() => fileRef.current?.click()}
          >
            📥
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
          }}
        />
      </div>

      {loading ? (
        <div className="empty">
          <div className="spinner" aria-label="加载中" />
          <p>正在翻食谱…</p>
        </div>
      ) : filtered.length === 0 ? (
        t
          ? renderEmpty('🍃', '没有找到', `没有包含「${q.trim()}」的菜，换个词试试`)
          : renderEmpty('🍽️', '还没有一道菜', '吃过的、想吃的，都记下来\n以后做菜就有参考了')
      ) : (
        <>
          <p className="list-meta">
            共 {filtered.length} 道菜{t ? ` · 匹配「${q.trim()}」` : ''}
          </p>
          <div className="dish-grid">
            {filtered.map((d, i) => (
              <DishCard key={d.id ?? i} dish={d} index={i} onClick={() => onOpenDetail(d.id!)} />
            ))}
          </div>
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}