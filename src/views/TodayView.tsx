import { useCallback, useEffect, useMemo, useState } from 'react';
import PhotoImg from '../components/PhotoImg';
import { Stars } from '../components/Stars';
import { useDishes } from '../store';
import type { Dish } from '../types';

interface Props {
  onOpenDetail: (id: number) => void;
}

/**
 * 今天吃什么：纯随机翻牌 + 预定的菜单（可移除/清空）。
 */
export default function TodayView({ onOpenDetail }: Props) {
  const { dishes, markEaten, menuIds, removeFromTodayMenu, clearTodayMenu } = useDishes();
  const [pick, setPick] = useState<Dish | null>(null);
  const [seq, setSeq] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  /** 本次会话最近展示过的菜 id（只保留最近 2 道），随机时优先避开、避免连续重复 */
  const [history, setHistory] = useState<number[]>([]);

  /** 可被推荐的候选：排除已在预定的菜单里的菜 */
  const available = useMemo(
    () => dishes.filter((d) => d.id != null && !menuIds.includes(d.id)),
    [dishes, menuIds],
  );

  const shuffle = useCallback(() => {
    if (available.length === 0) {
      setPick(null);
      return;
    }
    // 纯随机：只从「未预定」的菜中抽取；会话内短暂避开刚展示过的，防止连续重复
    let pool = available.filter((d) => d.id != null && !history.includes(d.id));
    if (pool.length === 0) pool = available;
    let next = pool[Math.floor(Math.random() * pool.length)]!;
    if (pool.length > 1 && pick && next.id === pick.id) {
      const others = pool.filter((d) => d.id !== pick.id);
      next = others[Math.floor(Math.random() * others.length)]!;
    }
    setHistory((prev) => [...prev, next.id!].slice(-2));
    setPick(next);
    setSeq((s) => s + 1);
  }, [available, history, pick]);

  useEffect(() => {
    if (!pick && available.length > 0) shuffle();
  }, [available, pick, shuffle]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const handleEat = async () => {
    if (!pick) return;
    await markEaten(pick);
    flash('已加入预定的菜单 🍱');
    setPick(null); // 加入菜单后不再参与推荐，重掷一张
  };

  const handleRemoveFromMenu = async (id: number) => {
    await removeFromTodayMenu(id);
    flash('已从预定的菜单移除');
  };

  const handleClearMenu = async () => {
    await clearTodayMenu();
    flash('已清空预定的菜单');
  };

  // 预定的菜单（保持加入顺序；已删除的菜自动忽略）
  const menuDishes = menuIds
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d): d is Dish => d != null);

  if (dishes.length === 0) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">🎲</div>
          <h3>没有牌可翻</h3>
          <p>菜库里还没有菜。先去「菜库」记下几道菜，</p>
          <p>回来再掷骰子。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {available.length === 0 ? (
        // 所有菜都在预定的菜单里：推荐区显示空态；菜单列表保持可见可操作
        <div className="stage">
          <div className="empty">
            <div className="empty-icon">🍱</div>
            <h3>菜都在预定的菜单里啦</h3>
            <p>预定的菜单里的菜不会参与随机推荐，</p>
            <p>把它移出菜单，骰子才会重新滚动。</p>
          </div>
        </div>
      ) : !pick ? (
        <div className="stage">
          <div className="empty">
            <div className="spinner" aria-label="翻牌中" />
            <p>正在翻牌…</p>
          </div>
        </div>
      ) : (
        <div className="stage">
          <p className="stage-hint">今天吃点什么？掷个骰子吧 🎲</p>

        <div className="today-card" key={`${pick.id}-${seq}`}>
          {pick.photos.length > 0 ? (
            <div className="today-photo">
              <PhotoImg photo={pick.photos[0]} className="today-img" alt={pick.name} />
            </div>
          ) : (
            <div className="today-photo today-cover" aria-hidden="true">
              <span>{pick.name.trim().charAt(0)}</span>
            </div>
          )}
          <div className="today-body">
            <h2 className="today-name">{pick.name}</h2>
            {pick.ingredients.length > 0 && (
              <div className="card-chips">
                {pick.ingredients.slice(0, 5).map((ing) => (
                  <span className="chip" key={ing}>
                    {ing}
                  </span>
                ))}
                {pick.ingredients.length > 5 && (
                  <span className="chip dim">+{pick.ingredients.length - 5}</span>
                )}
              </div>
            )}
            <div className="today-stars">
              <Stars value={pick.rating} size={20} />
            </div>
          </div>
        </div>

        <div className="today-actions">
          <button type="button" className="btn btn-ghost btn-lg" onClick={shuffle}>
            🎲 换一个
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleEat}>
            今天吃它！
          </button>
        </div>

        <button type="button" className="link-btn" onClick={() => onOpenDetail(pick.id!)}>
          查看详情 →
        </button>
        </div>
      )}

      <section className="menu-section" aria-label="预定的菜单">
        <div className="menu-head">
          <h3>🍱 预定的菜单</h3>
          {menuDishes.length > 0 && <span className="menu-count">{menuDishes.length} 道</span>}
          {menuDishes.length > 0 && (
            <button type="button" className="menu-clear" onClick={() => void handleClearMenu()}>
              清空
            </button>
          )}
        </div>
        {menuDishes.length === 0 ? (
          <p className="menu-empty">还是空的 —— 点「今天吃它」把菜加进来</p>
        ) : (
          <ul className="menu-list">
            {menuDishes.map((d) => (
              <li
                className="menu-item"
                key={d.id}
                onClick={() => onOpenDetail(d.id!)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenDetail(d.id!);
                }}
              >
                <div className="menu-thumb">
                  {d.photos.length > 0 ? (
                    <PhotoImg photo={d.photos[0]} className="menu-img" alt={d.name} />
                  ) : (
                    <span className="menu-cover">{d.name.trim().charAt(0)}</span>
                  )}
                </div>
                <div className="menu-info">
                  <span className="menu-name">{d.name}</span>
                  {d.ingredients.length > 0 && (
                    <span className="menu-ings">
                      {d.ingredients.slice(0, 3).join(' · ')}
                      {d.ingredients.length > 3 ? ' 等' : ''}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="menu-del"
                  aria-label={`从预定的菜单移除 ${d.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemoveFromMenu(d.id!);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}