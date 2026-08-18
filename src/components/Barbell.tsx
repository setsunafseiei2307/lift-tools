import type { PlateCount } from '../lib/plates';

interface BarbellProps {
  perSide: PlateCount[];
  bar: number;
  unit: string;
}

/**
 * 片側のプレート構成から実際のバーベルを描く。
 * 数字の羅列よりも、ジムで見る形そのままの方が積み間違いに気づきやすい。
 */
export function Barbell({ perSide, bar, unit }: BarbellProps) {
  const flat: PlateCount[] = [];
  for (const p of perSide) {
    for (let i = 0; i < p.count; i++) flat.push(p);
  }

  const CENTER = 200;
  const SLEEVE_START = 58;
  const AVAILABLE = 120;
  const GAP = 2;

  const rawWidths = flat.map((p) => Math.max(7, 9 + 16 * p.size));
  const rawTotal = rawWidths.reduce((s, w) => s + w + GAP, 0);
  const scale = rawTotal > AVAILABLE ? AVAILABLE / rawTotal : 1;
  const widths = rawWidths.map((w) => w * scale);

  let cursor = SLEEVE_START;
  const placed = flat.map((plate, i) => {
    const w = widths[i];
    const h = Math.max(26, 96 * plate.size);
    const item = { plate, w, h, offset: cursor };
    cursor += w + GAP * scale;
    return item;
  });

  const sleeveEnd = Math.max(cursor + 6, SLEEVE_START + 40);

  return (
    <div className="barbell">
      <svg viewBox="0 0 400 130" role="img" aria-label={`バーベルの積み方。バー${bar}${unit}`}>
        {/* シャフト */}
        <rect x={CENTER - sleeveEnd - 14} y="60" width={(sleeveEnd + 14) * 2} height="10" rx="5" fill="var(--bar-metal)" />
        {/* ローレット部 */}
        <rect x={CENTER - 52} y="59" width="104" height="12" rx="6" fill="var(--bar-knurl)" />
        {/* カラー（内側の段差） */}
        {[-1, 1].map((dir) => (
          <rect
            key={dir}
            x={dir === 1 ? CENTER + SLEEVE_START - 12 : CENTER - SLEEVE_START - 2}
            y="53"
            width="14"
            height="24"
            rx="3"
            fill="var(--bar-collar)"
          />
        ))}

        {placed.map((item, i) =>
          [-1, 1].map((dir) => {
            const x = dir === 1 ? CENTER + item.offset : CENTER - item.offset - item.w;
            return (
              <g key={`${i}-${dir}`}>
                <rect
                  x={x}
                  y={65 - item.h / 2}
                  width={item.w}
                  height={item.h}
                  rx={Math.min(4, item.w / 2)}
                  fill={item.plate.color}
                  stroke="var(--plate-edge)"
                  strokeWidth="1"
                />
              </g>
            );
          }),
        )}

        {placed.length === 0 && (
          <text x={CENTER} y="100" textAnchor="middle" className="barbell__empty">
            バーのみ
          </text>
        )}
      </svg>

      <ul className="barbell__legend">
        {perSide.map((p) => (
          <li key={p.weight}>
            <span
              className={`chip${p.light ? ' chip--light' : ''}`}
              style={{ background: p.color }}
              aria-hidden="true"
            />
            <span className="barbell__legend-weight">
              {p.weight}
              <small>{unit}</small>
            </span>
            <span className="barbell__legend-count">×{p.count}</span>
          </li>
        ))}
        {perSide.length === 0 && <li className="barbell__legend-none">プレートなし</li>}
      </ul>
    </div>
  );
}
