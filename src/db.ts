import type { Dish } from './types';

const DB_NAME = 'chilema';
const STORE_DISHES = 'dishes';
const STORE_MENU = 'menu';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DISHES)) {
        db.createObjectStore(STORE_DISHES, { keyPath: 'id', autoIncrement: true });
      }
      // v2：预定的菜单，{ date: 'plan', dishIds: number[] }
      if (!db.objectStoreNames.contains(STORE_MENU)) {
        db.createObjectStore(STORE_MENU, { keyPath: 'date' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function request<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function getAllDishes(): Promise<Dish[]> {
  const rows = await request<Dish[]>(STORE_DISHES, 'readonly', (s) => s.getAll());
  // 兼容旧数据：补齐缺省的 eatenCount
  return rows
    .map((d) => ({ ...d, eatenCount: d.eatenCount ?? 0 }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function insertDish(dish: Omit<Dish, 'id'>): Promise<number> {
  const id = await request<IDBValidKey>(STORE_DISHES, 'readwrite', (s) => s.add(dish));
  return Number(id);
}

export async function putDish(dish: Dish): Promise<void> {
  await request(STORE_DISHES, 'readwrite', (s) => s.put(dish));
}

export async function removeDish(id: number): Promise<void> {
  await request(STORE_DISHES, 'readwrite', (s) => s.delete(id));
}

export interface MenuRecord {
  date: string;
  dishIds: number[];
}

/** 某一天的菜单（菜 id 列表，按加入顺序）。 */
export async function getMenuIds(date: string): Promise<number[]> {
  const rec = await request<MenuRecord | undefined>(STORE_MENU, 'readonly', (s) => s.get(date));
  return rec?.dishIds ?? [];
}

export async function setMenuIds(date: string, dishIds: number[]): Promise<void> {
  await request(STORE_MENU, 'readwrite', (s) => s.put({ date, dishIds }));
}

/* ---------------- 备份 / 恢复 ---------------- */

export interface BackupPhoto {
  key: string;
  /** data URL（照片的 base64），便于存入 JSON 备份文件 */
  dataUrl: string;
}

export interface BackupDish extends Omit<Dish, 'photos'> {
  photos: BackupPhoto[];
}

export interface BackupFile {
  app: 'chilema';
  version: 1;
  exportedAt: number;
  dishes: BackupDish[];
  menuIds: number[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const sep = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, sep);
  const b64 = dataUrl.slice(sep + 1);
  const mime = /data:(.*?)(;|$)/.exec(meta)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function getDish(id: number): Promise<Dish | undefined> {
  return request<Dish | undefined>(STORE_DISHES, 'readonly', (s) => s.get(id));
}

/** 生成完整备份：全部菜（含照片）+ 预定的菜单。 */
export async function buildBackup(dishes: Dish[], menuIds: number[]): Promise<BackupFile> {
  const list: BackupDish[] = await Promise.all(
    dishes.map(async (d) => ({
      ...d,
      photos: await Promise.all(
        d.photos.map(async (p) => ({ key: p.key, dataUrl: await blobToDataUrl(p.blob) })),
      ),
    })),
  );
  return { app: 'chilema', version: 1, exportedAt: Date.now(), dishes: list, menuIds };
}

/**
 * 合并导入（安全，不覆盖现有数据）：
 * - 备份中 id 不存在的菜写入（保留原 id），已存在的跳过
 * - 预定的菜单取并集，并清理已不存在菜品
 * 返回：新增菜数量、合并后的菜单。
 */
export async function restoreBackup(backup: BackupFile): Promise<{ added: number; menu: number[] }> {
  let added = 0;
  for (const bd of backup.dishes) {
    if (bd.id == null) continue; // 备份缺少 id 的记录跳过
    const exists = await getDish(bd.id);
    if (!exists) {
      await putDish({
        ...bd,
        photos: bd.photos.map((p) => ({ key: p.key, blob: dataUrlToBlob(p.dataUrl) })),
      });
      added++;
    }
  }
  const existIds = new Set(
    (await getAllDishes()).map((d) => d.id).filter((id): id is number => id != null),
  );
  const merged: number[] = [];
  const push = (id: number) => {
    if (existIds.has(id) && !merged.includes(id)) merged.push(id);
  };
  (await getMenuIds('plan')).forEach(push);
  backup.menuIds.forEach(push);
  await setMenuIds('plan', merged);
  return { added, menu: merged };
}