import { useEffect, useState } from 'react';
import { OneRmTool } from './tools/OneRmTool';
import { RpeTool } from './tools/RpeTool';
import { PlateTool } from './tools/PlateTool';
import { SmolovTool } from './tools/SmolovTool';
import { NutritionTool } from './tools/NutritionTool';
import { FoodTool } from './tools/FoodTool';
import { load, save } from './lib/storage';

type ToolKey = '1rm' | 'rpe' | 'plate' | 'smolov' | 'pfc' | 'food';

const TOOLS: { key: ToolKey; label: string; sub: string; color: string }[] = [
  { key: '1rm', label: '1RM換算', sub: '重量×回数から最大重量', color: 'var(--blue)' },
  { key: 'rpe', label: 'RPE換算', sub: '主観強度から重量を決める', color: 'var(--green)' },
  { key: 'plate', label: 'プレート', sub: '片側に何を載せるか', color: 'var(--red)' },
  { key: 'smolov', label: 'Smolov', sub: '4週プログラム生成', color: 'var(--yellow)' },
  { key: 'pfc', label: 'PFC・カロリー', sub: '摂取量と三大栄養素', color: 'var(--green)' },
  { key: 'food', label: '食品検索', sub: '食品ごとのカロリーとPFC', color: 'var(--blue)' },
];

type Theme = 'light' | 'dark';

function readHash(): ToolKey {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const found = TOOLS.find((t) => t.key === raw);
  return found ? found.key : '1rm';
}

export default function App() {
  const [tool, setTool] = useState<ToolKey>(readHash);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = load<Theme | null>('theme', null);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setTool(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (key: ToolKey) => {
    setTool(key);
    window.location.hash = `/${key}`;
  };

  const active = TOOLS.find((t) => t.key === tool) ?? TOOLS[0];

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__inner">
          <div className="masthead__brand">
            <svg viewBox="0 0 44 20" className="masthead__mark" aria-hidden="true">
              <rect x="0" y="8" width="44" height="4" rx="2" fill="currentColor" />
              <rect x="6" y="2" width="6" height="16" rx="2" fill="var(--blue)" />
              <rect x="32" y="2" width="6" height="16" rx="2" fill="var(--blue)" />
              <rect x="14" y="5" width="4" height="10" rx="1.5" fill="var(--yellow)" />
              <rect x="26" y="5" width="4" height="10" rx="1.5" fill="var(--yellow)" />
            </svg>
            <h1>筋トレ計算ツール</h1>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <nav className="tabs" aria-label="ツールの切り替え">
          <ul>
            {TOOLS.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  className={`tabs__item${t.key === tool ? ' is-active' : ''}`}
                  style={{ ['--tab-accent' as string]: t.color }}
                  aria-current={t.key === tool ? 'page' : undefined}
                  onClick={() => select(t.key)}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="main">
        <p className="lede">{active.sub}</p>
        {tool === '1rm' && <OneRmTool />}
        {tool === 'rpe' && <RpeTool />}
        {tool === 'plate' && <PlateTool />}
        {tool === 'smolov' && <SmolovTool />}
        {tool === 'pfc' && <NutritionTool />}
        {tool === 'food' && <FoodTool />}
      </main>

      <footer className="footer">
        <p>
          計算結果はあくまで目安です。持病がある場合や体調に不安がある場合は、医師や専門家に相談してください。
        </p>
        <p className="footer__meta">入力内容はこの端末のブラウザにのみ保存されます。</p>
      </footer>
    </div>
  );
}
