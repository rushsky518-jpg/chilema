import type { Dish } from '../types';
import { fmtDate } from '../format';
import PhotoImg from './PhotoImg';
import { Stars } from './Stars';

interface Props {
  dish: Dish;
  index: number;
  onClick: () => void;
}

/**
 * 菜品卡片：照片（或菜名首字封面）+ 菜名 + 配料标签 + 评分/日期。
 */
export default function DishCard({ dish, index, onClick }: Props) {
  const cover = dish.name.trim().charAt(0);
  const shown = dish.ingredients.slice(0, 3);
  const more = dish.ingredients.length - shown.length;

  return (
    <article
      className="dish-card"
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <div className="card-photo">
        {dish.photos.length > 0 ? (
          <PhotoImg photo={dish.photos[0]} className="card-img" alt={dish.name} />
        ) : (
          <div className="card-cover" aria-hidden="true">
            <span>{cover}</span>
          </div>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-name">{dish.name}</h3>
        {dish.ingredients.length > 0 && (
          <div className="card-chips">
            {shown.map((ing) => (
              <span className="chip" key={ing}>
                {ing}
              </span>
            ))}
            {more > 0 && <span className="chip dim">+{more}</span>}
          </div>
        )}
        <div className="card-foot">
          <Stars value={dish.rating} />
          <span className="card-date">{fmtDate(dish.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}