import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as db from './db';
import type { Dish, DishInput } from './types';

/** 预定菜单使用固定键存储（不按天分割，预定的菜一直保留到你移除） */
const MENU_KEY = 'plan';

interface DishesContextValue {
  dishes: Dish[];
  loading: boolean;
  addDish: (input: DishInput) => Promise<number>;
  updateDish: (dish: Dish) => Promise<void>;
  deleteDish: (id: number) => Promise<void>;
  markEaten: (dish: Dish) => Promise<void>;
  /** 预定的菜单（菜 id，按加入顺序） */
  menuIds: number[];
  addToTodayMenu: (id: number) => Promise<void>;
  removeFromTodayMenu: (id: number) => Promise<void>;
  clearTodayMenu: () => Promise<void>;
  /** 所有记录中出现过的配料，按使用次数降序，用于输入自动补全 */
  suggestions: string[];
  /** 导出完整备份（菜+照片+预定的菜单）为 JSON 字符串 */
  backupJson: () => Promise<string>;
  /** 从备份 JSON 合并导入，返回新增菜数量 */
  restoreFromJson: (json: string) => Promise<number>;
}

const DishesContext = createContext<DishesContextValue | null>(null);

export function DishesProvider({ children }: { children: ReactNode }) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuIds, setMenuIds] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    setDishes(await db.getAllDishes());
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [list, menu] = await Promise.all([db.getAllDishes(), db.getMenuIds(MENU_KEY)]);
        if (alive) {
          setDishes(list);
          setMenuIds(menu);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const addDish = useCallback(
    async (input: DishInput): Promise<number> => {
      const id = await db.insertDish({
        ...input,
        createdAt: Date.now(),
        lastEatenAt: null,
        eatenCount: 0,
      });
      await refresh();
      return id;
    },
    [refresh],
  );

  const updateDish = useCallback(
    async (dish: Dish) => {
      await db.putDish(dish);
      await refresh();
    },
    [refresh],
  );

  const deleteDish = useCallback(
    async (id: number) => {
      await db.removeDish(id);
      // 若在预定的菜单中，一并移出
      if (menuIds.includes(id)) {
        const next = menuIds.filter((x) => x !== id);
        await db.setMenuIds(MENU_KEY, next);
        setMenuIds(next);
      }
      await refresh();
    },
    [menuIds, refresh],
  );

  const addToTodayMenu = useCallback(
    async (id: number) => {
      const next = menuIds.includes(id) ? menuIds : [...menuIds, id];
      await db.setMenuIds(MENU_KEY, next);
      setMenuIds(next);
    },
    [menuIds],
  );

  const removeFromTodayMenu = useCallback(
    async (id: number) => {
      const next = menuIds.filter((x) => x !== id);
      await db.setMenuIds(MENU_KEY, next);
      setMenuIds(next);
    },
    [menuIds],
  );

  const clearTodayMenu = useCallback(async () => {
    await db.setMenuIds(MENU_KEY, []);
    setMenuIds([]);
  }, []);

  const markEaten = useCallback(
    async (dish: Dish) => {
      await db.putDish({
        ...dish,
        eatenCount: (dish.eatenCount ?? 0) + 1,
        lastEatenAt: Date.now(),
      });
      // 同时加入预定的菜单
      if (dish.id != null && !menuIds.includes(dish.id)) {
        const next = [...menuIds, dish.id];
        await db.setMenuIds(MENU_KEY, next);
        setMenuIds(next);
      }
      await refresh();
    },
    [menuIds, refresh],
  );

  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dishes) {
      for (const ing of d.ingredients) {
        counts.set(ing, (counts.get(ing) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [dishes]);

  const backupJson = useCallback(async (): Promise<string> => {
    return JSON.stringify(await db.buildBackup(dishes, menuIds));
  }, [dishes, menuIds]);

  const restoreFromJson = useCallback(
    async (json: string): Promise<number> => {
      const backup = JSON.parse(json) as db.BackupFile;
      const { added, menu } = await db.restoreBackup(backup);
      await refresh();
      setMenuIds(menu);
      return added;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      dishes,
      loading,
      addDish,
      updateDish,
      deleteDish,
      markEaten,
      menuIds,
      addToTodayMenu,
      removeFromTodayMenu,
      clearTodayMenu,
      suggestions,
      backupJson,
      restoreFromJson,
    }),
    [
      dishes,
      loading,
      addDish,
      updateDish,
      deleteDish,
      markEaten,
      menuIds,
      addToTodayMenu,
      removeFromTodayMenu,
      clearTodayMenu,
      suggestions,
      backupJson,
      restoreFromJson,
    ],
  );

  return <DishesContext.Provider value={value}>{children}</DishesContext.Provider>;
}

export function useDishes(): DishesContextValue {
  const ctx = useContext(DishesContext);
  if (!ctx) throw new Error('useDishes 必须在 DishesProvider 内使用');
  return ctx;
}