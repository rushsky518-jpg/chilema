interface StarsProps {
  value: number | null;
  size?: number;
}

/** 只读星级展示；null 显示灰色空星 */
export function Stars({ value, size = 16 }: StarsProps) {
  const v = value ?? 0;
  return (
    <span className="stars" role="img" aria-label={value ? `${value} 星` : '未评分'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= v ? 'star on' : 'star'} style={{ fontSize: size }}>
          ★
        </span>
      ))}
    </span>
  );
}

interface SelectorProps {
  value: number | null;
  onChange: (v: number | null) => void;
}

/** 可点击的星级评选组件 */
export function StarSelector({ value, onChange }: SelectorProps) {
  return (
    <div className="star-selector" role="radiogroup" aria-label="评分">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={value != null && i <= value ? 'star-btn on' : 'star-btn'}
          onClick={() => onChange(value === i ? null : i)}
          aria-label={`${i} 星`}
        >
          ★
        </button>
      ))}
    </div>
  );
}