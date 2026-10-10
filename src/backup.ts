import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** 备份文件名：吃了吗备份-20260929-1530.json */
export function backupFileName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `吃了吗备份-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

/**
 * 把备份 JSON 存成文件：
 * - 原生 App（Android）：写入「文档/吃了吗备份/」并弹出系统分享面板，可存到微信/文件管理
 * - 浏览器 / PWA：直接触发下载
 * 返回提示文案。
 */
export async function exportBackupFile(json: string, name: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const dir = '吃了吗备份';
    await Filesystem.mkdir({ path: dir, directory: Directory.Documents, recursive: true });
    const path = `${dir}/${name}`;
    const res = await Filesystem.writeFile({
      path,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: '吃了吗备份',
        text: `吃了吗 数据备份（${name}）`,
        files: [res.uri],
        dialogTitle: '保存或分享备份',
      });
      return `备份成功：${name} 📤`;
    } catch {
      return `备份成功，已存到「文档/吃了吗备份」📤`;
    }
  }
  // 浏览器：Blob 下载
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return `备份已下载：${name} 📤`;
}