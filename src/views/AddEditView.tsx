import { useMemo, useRef, useState } from 'react';
import Overlay from '../components/Overlay';
import PhotoFields from '../components/PhotoFields';
import { StarSelector } from '../components/Stars';
import { useDishes } from '../store';
import type { Photo } from '../types';

interface Props {
  dishId?: number;
  onClose: () => void;
  onSaved: (id: number) => void;
}

/**
 * 添加 / 编辑菜品。
 */
export default function AddEditView({ dishId, onClose, onSaved }: Props) {
  const { dishes, addDish, updateDish, suggestions } = useDishes();
  const editing = dishId != null ? dishes.find((d) => d.id === dishId) ?? null : null;

  const [name, setName] = useState(editing?.name ?? '');
  const [ingredients, setIngredients] = useState<string[]>(editing?.ingredients ?? []);
  const [photos, setPhotos] = useState<Photo[]>(editing?.photos ?? []);
  const [rating, setRating] = useState<number | null>(editing?.rating ?? null);
  const [note, setNote] = useState(editing?.note ?? '');
  const [ingInput, setIngInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  /** 同名菜检测：trim 后精确匹配（不区分大小写），排除当前编辑的菜自己 */
  const duplicate = useMemo(() => {
    const v = name.trim().toLocaleLowerCase();
    if (!v) return null;
    return (
      dishes.find(
        (d) => d.id !== dishId && d.name.trim().toLocaleLowerCase() === v,
      ) ?? null
    );
  }, [dishes, name, dishId]);

  const suggestionList = useMemo(() => {
    const key = ingInput.trim().toLowerCase();
    return suggestions
      .filter((s) => !ingredients.includes(s))
      .filter((s) => (key ? s.toLowerCase().includes(key) : true))
      .slice(0, 8);
  }, [ingredients, suggestions, ingInput]);

  const addIngredient = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setIngredients((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setIngInput('');
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请先填写菜名');
      nameRef.current?.focus();
      return;
    }
    if (duplicate) {
      setError(`已有同名菜肴「${duplicate.name}」，换个名字吧`);
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      let savedId: number;
      if (editing) {
        await updateDish({
          ...editing,
          name: trimmed,
          ingredients,
          photos,
          rating,
          note: note.trim(),
        });
        savedId = editing.id!;
      } else {
        savedId = await addDish({ name: trimmed, ingredients, photos, rating, note: note.trim() });
      }
      // 保存后跳转到详情，让用户看到刚记录的成果
      onSaved(savedId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay
      title={editing ? '编辑菜品' : '记一道菜'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : editing ? '保存修改' : '记下这道菜'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>照片（可多张，可选）</label>
        <PhotoFields photos={photos} onChange={setPhotos} />
      </div>

      <div className="field">
        <label htmlFor="dish-name">菜名 *</label>
        <input
          id="dish-name"
          ref={nameRef}
          className="input input-lg"
          placeholder="例如：土豆烧鸡块"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
        />
        {error && <p className="field-error">{error}</p>}
      </div>

      <div className="field">
        <label>配料（自由输入，逐条添加）</label>
        <div className="ing-add-row">
          <input
            className="input"
            placeholder="例如：土豆"
            value={ingInput}
            onChange={(e) => setIngInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addIngredient(ingInput);
              }
            }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addIngredient(ingInput)}>
            添加
          </button>
        </div>
        <div className="chip-list">
          {ingredients.map((ing) => (
            <span className="chip" key={ing}>
              {ing}
              <button
                type="button"
                className="chip-x"
                onClick={() => setIngredients(ingredients.filter((i) => i !== ing))}
                aria-label={`删除 ${ing}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {suggestionList.length > 0 && (
          <div className="suggest">
            <span className="suggest-label">常用配料：</span>
            {suggestionList.map((s) => (
              <button type="button" className="chip chip-btn" key={s} onClick={() => addIngredient(s)}>
                {s} ＋
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>口味评分</label>
        <StarSelector value={rating} onChange={setRating} />
      </div>

      <div className="field">
        <label htmlFor="dish-note">备注（做法、心得，可选）</label>
        <textarea
          id="dish-note"
          className="input"
          placeholder="今天的火候、调料，下次要注意的……"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>
    </Overlay>
  );
}