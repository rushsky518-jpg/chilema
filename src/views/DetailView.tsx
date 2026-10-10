import { useState } from 'react';
import Overlay from '../components/Overlay';
import PhotoImg from '../components/PhotoImg';
import PhotoViewer from '../components/PhotoViewer';
import { Stars } from '../components/Stars';
import { useDishes } from '../store';
import { fmtDate, fmtDateTime } from '../format';

interface Props {
  id: number;
  onClose: () => void;
  onEdit: () => void;
}

/**
 * 菜品详情：照片浏览、配料、评分、备注、吃过/编辑/删除。
 * 点击主图可全屏查看。
 */
export default function DetailView({ id, onClose, onEdit }: Props) {
  const { dishes, deleteDish, markEaten } = useDishes();
  const dish = dishes.find((d) => d.id === id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!dish) {
    return (
      <Overlay title="详情" onClose={onClose}>
        <div className="empty">
          <p>这条记录不存在或已被删除</p>
        </div>
      </Overlay>
    );
  }

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const handleEaten = async () => {
    await markEaten(dish);
    flash(`已加入预定的菜单 🍱（吃过 ${(dish.eatenCount ?? 0) + 1} 次）`);
  };

  const handleDelete = async () => {
    await deleteDish(dish.id!);
    onClose();
  };

  const main = dish.photos[photoIndex];

  return (
    <>
      <Overlay
        title="菜品详情"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn-primary" onClick={handleEaten}>
              ✓ 今天吃它
            </button>
            <button type="button" className="btn btn-ghost" onClick={onEdit}>
              编辑
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
              删除
            </button>
          </>
        }
      >
        <div className="detail-photo-main">
          {main ? (
            <button
              type="button"
              className="detail-photo-btn"
              onClick={() => setViewing(true)}
              aria-label="全屏查看照片"
            >
              <PhotoImg photo={main} className="detail-img" alt={dish.name} />
              <span className="photo-zoom-hint" aria-hidden="true">
                ⤢
              </span>
            </button>
          ) : (
            <div className="detail-cover" aria-hidden="true">
              <span>{dish.name.trim().charAt(0)}</span>
            </div>
          )}
          {dish.photos.length > 1 && (
            <span className="photo-count">
              {photoIndex + 1}/{dish.photos.length}
            </span>
          )}
        </div>

        {dish.photos.length > 1 && (
          <div className="thumbs">
            {dish.photos.map((p, i) => (
              <PhotoImg
                key={p.key}
                photo={p}
                className={i === photoIndex ? 'thumb on' : 'thumb'}
                onClick={() => setPhotoIndex(i)}
                alt={`${dish.name} 第 ${i + 1} 张`}
              />
            ))}
          </div>
        )}

        <h1 className="detail-name">{dish.name}</h1>

        <div className="eaten-badge">🍚 吃过 {dish.eatenCount ?? 0} 次</div>

        <div className="detail-stars">
          <Stars value={dish.rating} size={22} />
          <span className="dim-text">{dish.rating ? `评分 ${dish.rating}/5` : '还没评过分'}</span>
        </div>

        {dish.ingredients.length > 0 && (
          <section className="detail-section">
            <h3>配料</h3>
            <div className="chip-list">
              {dish.ingredients.map((ing) => (
                <span className="chip" key={ing}>
                  {ing}
                </span>
              ))}
            </div>
          </section>
        )}

        {dish.note && (
          <section className="detail-section">
            <h3>备注</h3>
            <p className="detail-note">{dish.note}</p>
          </section>
        )}

        <section className="detail-section">
          <h3>时间</h3>
          <p className="meta-line">记录于 {fmtDateTime(dish.createdAt)}</p>
          <p className="meta-line">
            {dish.lastEatenAt ? (
              <>
                最近吃过：{fmtDate(dish.lastEatenAt)}（仅作记录，不影响随机推荐）
              </>
            ) : (
              '还没点过「今天吃它」'
            )}
          </p>
        </section>

        {toast && <div className="toast">{toast}</div>}

        {confirming && (
          <div className="confirm-mask">
            <div className="confirm-box">
              <p>
                确定删除「{dish.name}」吗？
                <br />
                <span className="dim-text">照片与记录将一并删除，不可恢复。</span>
              </p>
              <div className="confirm-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                  取消
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  确定删除
                </button>
              </div>
            </div>
          </div>
        )}
      </Overlay>

      {viewing && main && (
        <PhotoViewer
          photos={dish.photos}
          index={photoIndex}
          name={dish.name}
          onIndexChange={setPhotoIndex}
          onClose={() => setViewing(false)}
        />
      )}
    </>
  );
}
