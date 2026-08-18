import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* 数値入力                                                            */
/* ------------------------------------------------------------------ */

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  inputMode?: 'decimal' | 'numeric';
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  error,
  placeholder,
  step = 1,
  min,
  max,
  inputMode = 'decimal',
}: NumberFieldProps) {
  const id = useId();
  const nudge = (delta: number) => {
    const current = Number(value.replace(/,/g, ''));
    const base = Number.isFinite(current) ? current : 0;
    let next = Number((base + delta).toFixed(4));
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(String(next));
  };

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <button
          type="button"
          className="field__nudge"
          onClick={() => nudge(-step)}
          aria-label={`${label}を${step}減らす`}
        >
          −
        </button>
        <input
          id={id}
          className="field__input"
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-desc` : undefined}
        />
        {unit && <span className="field__unit">{unit}</span>}
        <button
          type="button"
          className="field__nudge"
          onClick={() => nudge(step)}
          aria-label={`${label}を${step}増やす`}
        >
          ＋
        </button>
      </div>
      {(hint || error) && (
        <p id={`${id}-desc`} className={`field__hint${error ? ' field__hint--error' : ''}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* テキスト検索                                                        */
/* ------------------------------------------------------------------ */

interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

export function SearchField({ label, value, onChange, placeholder, hint }: SearchFieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control field__control--text">
        <span className="field__icon" aria-hidden="true">
          🔍
        </span>
        <input
          id={id}
          className="field__input field__input--text"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? `${id}-desc` : undefined}
        />
        {value !== '' && (
          <button
            type="button"
            className="field__nudge"
            onClick={() => onChange('')}
            aria-label="入力を消す"
          >
            ×
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-desc`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* セグメント選択                                                      */
/* ------------------------------------------------------------------ */

interface SegmentedProps<T extends string | number> {
  label?: string;
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (value: T) => void;
  /**
   * 選択肢1つに必要な最小幅(px)。列数はこの値と画面幅から決まり、
   * 入りきらない幅では折り返す。長いラベルを持つグループだけ大きめの値を渡す。
   */
  minItemWidth?: number;
  /** 選択肢の下に出す補足。何のための設定かが自明でないときに使う */
  hint?: string;
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  minItemWidth,
  hint,
}: SegmentedProps<T>) {
  return (
    <div className="segmented">
      {label && <span className="field__label">{label}</span>}
      <div
        className="segmented__row"
        role="radiogroup"
        aria-label={label}
        style={minItemWidth ? ({ ['--seg-min' as string]: `${minItemWidth}px` } as object) : undefined}
      >
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={opt.value === value}
            className={`segmented__item${opt.value === value ? ' is-active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            <span className="segmented__label">{opt.label}</span>
            {opt.sub && <span className="segmented__sub">{opt.sub}</span>}
          </button>
        ))}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 結果カード / 空状態 / 注意書き                                       */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  accent,
  children,
  action,
}: {
  title: string;
  accent?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel" style={accent ? { ['--panel-accent' as string]: accent } : undefined}>
      <header className="panel__head">
        <h2 className="panel__title">{title}</h2>
        {action}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 48 24" className="empty__icon" aria-hidden="true">
        <rect x="2" y="10" width="44" height="4" rx="2" fill="currentColor" opacity="0.35" />
        <rect x="8" y="5" width="5" height="14" rx="1.5" fill="currentColor" opacity="0.6" />
        <rect x="35" y="5" width="5" height="14" rx="1.5" fill="currentColor" opacity="0.6" />
      </svg>
      <p>{children}</p>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="note">{children}</p>;
}

/** その画面が何をする機能なのかを、本文の先頭で一度だけ説明する枠 */
export function Callout({ children }: { children: ReactNode }) {
  return <p className="callout">{children}</p>;
}

export function Warning({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="warning" role="status">
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* コピーボタン                                                        */
/* ------------------------------------------------------------------ */

export function CopyButton({ text, label = '結果をコピー' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setState('done');
    } catch {
      setState('failed');
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button type="button" className="copy" onClick={copy} disabled={!text}>
      {state === 'done' ? 'コピーしました' : state === 'failed' ? 'コピーできません' : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 大きな数値表示                                                      */
/* ------------------------------------------------------------------ */

export function BigNumber({
  value,
  unit,
  caption,
  tone = 'primary',
}: {
  value: string;
  unit?: string;
  caption: string;
  tone?: 'primary' | 'neutral';
}) {
  return (
    <div className={`bignum bignum--${tone}`}>
      <span className="bignum__caption">{caption}</span>
      <span className="bignum__value">
        {value}
        {unit && <span className="bignum__unit">{unit}</span>}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 折りたたみ                                                          */
/* ------------------------------------------------------------------ */

/**
 * 既定では畳んでおきたい補足情報の入れ物。
 * <details> をそのまま使い、開閉状態はブラウザに任せる（JSの状態を持たない）。
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary className="disclosure__summary">
        <span className="disclosure__marker" aria-hidden="true" />
        {summary}
      </summary>
      <div className="disclosure__body">{children}</div>
    </details>
  );
}
