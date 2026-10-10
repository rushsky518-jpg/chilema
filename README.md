# 吃了吗

本地菜品记录 Web 应用：记下吃过的菜（菜名、配料、照片、评分、备注），
随机推荐今天吃什么。**数据保存在浏览器 IndexedDB，文件不上传。**

技术栈与 `../workbench`（台面）一致：React 19 + TypeScript + Vite。

## 运行

```bash
npm install     # 首次
npm run dev     # 开发模式，浏览器打开 http://localhost:5173
npm run build   # 类型检查 + 产物构建到 dist/
npm run preview # 预览构建产物
```

## 使用

- **菜库**：搜索菜名/配料，点击卡片看详情，右下角「记一道菜」新增。
- **记一道菜**：相册多选/拍照、菜名必填、配料自由文本逐条添加（常用配料自动补全）、评分、备注。
- **详情**：照片浏览、「今天吃它」累计吃过次数、编辑、删除。
- **今天吃什么**：纯随机翻牌，换一个 / 今天吃它；点「今天吃它」会把菜加入**预定的菜单**（本页下方展示，可单条移除 / 一键清空，跨天保留）。

## PWA

`public/manifest.webmanifest` 声明了独立窗口安装（"添加到主屏"）。
手机浏览器菜单 → 添加到主屏幕，即可像 App 一样使用。

## Android 打包

```bash
npm run build && npx cap sync android    # 先把网页产物同步进 Android 工程，别漏这步
cd android && gradlew.bat assembleDebug  # 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

版本号存在 `android/version.properties`：

- **`versionCode` 每次打包自动 +1**（由 `app/build.gradle` 的 `bumpVersionCode` 任务写回）；
  `gradlew clean`、IDE 同步、`gradlew tasks`、`lintDebug` 都不会跳号。
- **`versionName`** 在这个文件里只写**基础版本号（前缀）**，例如 `1.8`。实际 APK 的版本名会自动
  拼上 build 号 —— `versionName + "." + versionCode`：`versionCode=21` 时版本名是 **`1.8.21`**，
  手机上「应用信息」里就能直接看出是哪个包。升主版本时只改这个前缀（`1.8` → `1.9`）。
- **打包前会先清掉上一次的 apk / aab**（`cleanOldPackages` 任务），所以 `outputs/`
  里永远只有刚打出来的那一个包——不会出现"这次打包失败、上次的旧包还留着被当成新包"。

> 注意：版本号写回发生在打包开始时，所以打包中途失败，版本号也已经 +1 了。

> 说明：第一版不做多端同步，Android / iOS / Windows / 各浏览器数据各自独立于本机。