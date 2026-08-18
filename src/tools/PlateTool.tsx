import { useMemo } from 'react';
import { NumberField, Segmented, Panel, CopyButton, Note, Warning } from '../components/ui';
import { Barbell } from '../components/Barbell';
import {
  BAR_OPTIONS,
  KG_PLATES,
  LB_PLATES,
  calcPlates,
  kgToLb,
  type Unit,
} from '../lib/plates';
import { parseNumber, fmt } from '../lib/format';
import { usePersistentState } from '../lib/storage';

export function PlateTool() {
  const [unit, setUnit] = usePersistentState<Unit>('plate.unit', 'kg');
  const [target, setTarget] = usePersistentState('plate.target', '100');
  const [bar, setBar] = usePersistentState<number>('plate.bar', 20);

  const plates = unit === 'kg' ? KG_PLATES : LB_PLATES;
  const bars = BAR_OPTIONS[unit];
  const barValue = bars.includes(bar) ? bar : bars[0];

  const targetNum = parseNumber(target);
  const targetError =
    target.trim() === ''
      ? '目標重量を入力してください'
      : targetNum == null
        ? '数値で入力してください'
        : targetNum <= 0
          ? '0より大きい値を入力してください'
          : targetNum > 1000
            ? '1000以下で入力してください'
            : null;

  const result = useMemo(() => {
    if (targetError || targetNum == null) return null;
    return calcPlates(targetNum, barValue, plates);
  }, [targetNum, barValue, plates, targetError]);

  const warnings: string[] = [];
  if (result?.error === 'BELOW_BAR') {
    warnings.push(`バー(${barValue}${unit})より軽い重量は組めません。`);
  }
  if (result && result.error == null && Math.abs(result.diff) > 1e-6) {
    warnings.push(
      `ぴったり組めないため ${fmt(result.achieved)}${unit} になります（目標との差 ${result.diff > 0 ? '+' : ''}${fmt(result.diff)}${unit}）。`,
    );
  }

  const copyText = useMemo(() => {
    if (!result || result.error) return '';
    const lines = result.perSide.map((p) => `${p.weight}${unit} × ${p.count}枚`);
    return [
      `${fmt(result.achieved)}${unit}（バー ${barValue}${unit}）`,
      '片側:',
      ...lines.map((l) => `  ${l}`),
    ].join('\n');
  }, [result, barValue, unit]);

  return (
    <div className="tool">
      <Panel title="組みたい重量" accent="var(--red)">
        <Segmented
          label="単位"
          value={unit}
          onChange={(next) => {
            setUnit(next);
            setBar(BAR_OPTIONS[next][0]);
          }}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
        />
        <NumberField
          label="目標重量"
          unit={unit}
          value={target}
          onChange={setTarget}
          step={unit === 'kg' ? 2.5 : 5}
          min={0}
          error={targetError}
        />
        <Segmented
          label="シャフト"
          value={barValue}
          onChange={setBar}
          options={bars.map((b) => ({ value: b, label: b === 0 ? 'なし' : `${b}${unit}` }))}
        />
      </Panel>

      {result && result.error !== 'INVALID' && (
        <Panel title="片側に載せるプレート" accent="var(--red)" action={<CopyButton text={copyText} />}>
          <Barbell perSide={result.perSide} bar={barValue} unit={unit} />
          <Warning items={warnings} />
          <dl className="stats">
            <div>
              <dt>合計</dt>
              <dd>
                {fmt(result.achieved)}
                <small>{unit}</small>
              </dd>
            </div>
            <div>
              <dt>片側</dt>
              <dd>
                {fmt(result.perSideWeight)}
                <small>{unit}</small>
              </dd>
            </div>
            <div>
              <dt>プレート枚数</dt>
              <dd>
                {result.perSide.reduce((s, p) => s + p.count, 0) * 2}
                <small>枚</small>
              </dd>
            </div>
            {unit === 'kg' && (
              <div>
                <dt>lb換算</dt>
                <dd>
                  {fmt(kgToLb(result.achieved), 0)}
                  <small>lb</small>
                </dd>
              </div>
            )}
          </dl>
          <Note>片側は重い順に、内側から外側へ載せます。左右対称に積んでください。</Note>
        </Panel>
      )}
    </div>
  );
}
