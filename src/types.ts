export interface Photo {
  /** 图片唯一标识，用于 objectURL 缓存与删除 */
  key: string;
  blob: Blob;
}

export interface Dish {
  /** IndexedDB 自增主键 */
  id?: number;
  name: string;
  ingredients: string[];
  photos: Photo[];
  /** 1-5，可为 null */
  rating: number | null;
  note: string;
  /** epoch 毫秒 */
  createdAt: number;
  /** 最近一次"吃过"的时间；null 表示从未记录 */
  lastEatenAt: number | null;
  /** 吃过次数（老数据缺省为 0，读取时归一化） */
  eatenCount: number;
}

export interface DishInput {
  name: string;
  ingredients: string[];
  photos: Photo[];
  rating: number | null;
  note: string;
}

export type Tab = 'list' | 'today';

export type OverlayView =
  | { type: 'detail'; id: number }
  | { type: 'edit'; dishId?: number };