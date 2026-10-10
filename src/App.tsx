import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { DishesProvider } from './store';
import { applyTheme, otherTheme, readTheme, saveTheme, THEME_LABEL, type Theme } from './theme';
import type { OverlayView, Tab } from './types';
import ListPage from './views/ListPage';
import TodayView from './views/TodayView';
import DetailView from './views/DetailView';
import AddEditView from './views/AddEditView';

export default function App() {
  return (
    <DishesProvider>
      <Shell />
    </DishesProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>('list');
  const [overlay, setOverlay] = useState<OverlayView | null>(null);

  // 主题：首屏已由 index.html 内联脚本预置，这里接管后续切换与同步
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = otherTheme(theme);
    setTheme(next);
    saveTheme(next);
  };

  // 最新状态镜像，供返回键回调读取（避免闭包拿到过期状态）
  const stateRef = useRef({ tab, overlay });
  useEffect(() => {
    stateRef.current = { tab, overlay };
  }, [tab, overlay]);

  useEffect(() => {
    document.body.style.overflow = overlay ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [overlay]);

  const handleBack = useCallback(() => {
    const s = stateRef.current;
    if (s.overlay) {
      setOverlay(null);
      return;
    }
    if (s.tab === 'today') {
      setTab('list');
      return;
    }
    if (Capacitor.isNativePlatform()) {
      void CapApp.exitApp();
    }
  }, []);

  // Android 系统返回键（原生 APK / 侧栏手势）
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let unregister: (() => void) | undefined;
    void CapApp.addListener('backButton', handleBack).then((handle) => {
      unregister = handle.remove;
    });
    return () => {
      unregister?.();
    };
  }, [handleBack]);

  // 浏览器 / PWA：Android Chrome 返回键走历史回退，用 popstate 接管同一逻辑
  useEffect(() => {
    window.addEventListener('popstate', handleBack);
    return () => {
      window.removeEventListener('popstate', handleBack);
    };
  }, [handleBack]);

  // 打开浮层 / 切到今天吃什么时压入一条历史，让浏览器返回键能回到上一层
  const prevOverlay = useRef<OverlayView | null>(null);
  useEffect(() => {
    if (overlay && !prevOverlay.current) {
      window.history.pushState({ chilema: 'overlay' }, '');
    }
    prevOverlay.current = overlay;
  }, [overlay]);

  const prevTab = useRef<Tab>('list');
  useEffect(() => {
    if (prevTab.current === 'list' && tab === 'today') {
      window.history.pushState({ chilema: 'today' }, '');
    }
    prevTab.current = tab;
  }, [tab]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setOverlay(null);
  };

  // 手机左右滑动切换「菜库 / 今天吃什么」：记录触摸起点，仅当明显横向滑动时切换
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || overlay) return; // 浮层打开时不响应手势
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // 横向位移需足够大，且明显大于纵向位移（避免误伤竖向滚动）
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && tab === 'list') switchTab('today'); // 左滑 → 今天吃什么
    else if (dx > 0 && tab === 'today') switchTab('list'); // 右滑 → 菜库
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-mark">米</span>
          <div className="brand-text">
            <strong>吃了吗</strong>
            <em>好吃就记下来</em>
          </div>
        </div>
        <div className="top-actions">
          <nav className="tabs" aria-label="主导航">
            <button
              type="button"
              className={tab === 'list' ? 'tab active' : 'tab'}
              onClick={() => switchTab('list')}
            >
              <span className="tab-emoji" aria-hidden="true">
                🍲
              </span>{' '}
              菜库
            </button>
            <button
              type="button"
              className={tab === 'today' ? 'tab active' : 'tab'}
              onClick={() => switchTab('today')}
            >
              <span className="tab-emoji" aria-hidden="true">
                🎲
              </span>{' '}
              今天吃什么
            </button>
          </nav>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`切换主题（当前：${THEME_LABEL[theme]}）`}
            title={`当前主题：${THEME_LABEL[theme]}，点击切换`}
          >
            <span className="theme-swatch" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main
        className="main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {tab === 'list' ? (
          <ListPage
            onOpenDetail={(id) => setOverlay({ type: 'detail', id })}
            onOpenNew={() => setOverlay({ type: 'edit' })}
          />
        ) : (
          <TodayView onOpenDetail={(id) => setOverlay({ type: 'detail', id })} />
        )}
      </main>

      {tab === 'list' && (
        <button type="button" className="fab" onClick={() => setOverlay({ type: 'edit' })}>
          <span className="fab-plus">＋</span>
          <span>记一道菜</span>
        </button>
      )}

      {overlay?.type === 'detail' && (
        <DetailView
          id={overlay.id}
          onClose={() => setOverlay(null)}
          onEdit={() => setOverlay({ type: 'edit', dishId: overlay.id })}
        />
      )}
      {overlay?.type === 'edit' && (
        <AddEditView
          key={overlay.dishId ?? 'new'}
          dishId={overlay.dishId}
          onClose={() => setOverlay(null)}
          onSaved={(id) => setOverlay(id > 0 ? { type: 'detail', id } : null)}
        />
      )}
    </div>
  );
}