import { useMemo } from 'react';
import { NumberField, Segmented, Panel, EmptyState, BigNumber, CopyButton, Note } from '../components/ui';
import { oneRmFromRpe, rpePercent, buildRpeMatrix, RPE_VALUES, RPE_MAX_REPS } from '../lib/rpe';
import { parseNumber, fmt, roundTo } from '../lib/format';
import { usePersistentState } from '../lib/storage';

export function RpeTool() {
  const [weight, setWeight] = usePersistentState('rpe.weight', '100');
  const [reps, setReps] = usePersistentState('rpe.reps', '5');
  const [rpe, setRpe] = usePersistentState<number>('rpe.rpe', 8);
  const [increment, setIncrement] = usePersistentState<number>('rpe.increment', 2.5);

  const weightNum = parseNumber(weight);
  const repsNum = parseNumber(reps);

  const weightError =
    weight.trim() === ''
      ? '重量を入力してください'
      : weightNum == null || weightNum <= 0
        ? '0より大きい数値を入力してください'
        : null;

  const repsError =
    reps.trim() === ''
      ? '回数を入力してください'
      : repsNum == null
        ? '数値で入力してください'
        : repsNum < 1 || repsNum > RPE_MAX_REPS
          ? `1〜${RPE_MAX_REPS}回で入力してください`
          : null;

  const percent = repsError ? null : rpePercent(repsNum ?? 0, rpe);
  const oneRM =
    weightError || repsError ? null : oneRmFromRpe(weightNum ?? 0, repsNum ?? 0, rpe);

  const matrix = useMemo(() => buildRpeMatrix(oneRM, 8, increment), [oneRM, increment]);

  const copyText = useMemo(() => {
    if (oneRM == null) return '';
    return [
      `${fmt(weightNum ?? 0)}kg × ${repsNum}回 @RPE${rpe}`,
      `→ 1RMの${fmt(percent ?? 0)}%、推定1RM ${fmt(oneRM)}kg`,
    ].join('\n');
  }, [oneRM, weightNum, repsNum, rpe, percent]);

  return (
    <div className="tool">
      <Panel title="実施したセット" accent="var(--green)">
        <div className="grid grid--2">
          <NumberField
            label="重量"
            unit="kg"
            value={weight}
            onChange={setWeight}
            step={2.5}
            min={0}
            error={weightError}
          />
          <NumberField
            label="回数"
            unit="回"
            value={reps}
            onChange={setReps}
            step={1}
            min={1}
            max={RPE_MAX_REPS}
            error={repsError}
            inputMode="numeric"
          />
        </div>
        <Segmented
          label="RPE（あと何回できたか）"
          value={rpe}
          onChange={setRpe}
          options={RPE_VALUES.map((v) => ({
            value: v,
            label: String(v),
            sub: v === 10 ? '限界' : `+${Math.round((10 - v) * 2) / 2}回`,
          }))}
        />
        <Segmented
          label="重量の丸め"
          value={increment}
          onChange={setIncrement}
          options={[
            { value: 0, label: '丸めない' },
            { value: 1.25, label: '1.25kg' },
            { value: 2.5, label: '2.5kg' },
            { value: 5, label: '5kg' },
          ]}
        />
      </Panel>

      {oneRM != null && percent != null ? (
        <>
          <Panel title="推定1RM" accent="var(--green)" action={<CopyButton text={copyText} />}>
            <BigNumber value={fmt(oneRM)} unit="kg" caption={`このセットは1RMの ${fmt(percent)}%`} />
            <Note>
              RPE8 は「あと2回できた」感覚です。同じ重量でも RPE が下がるほど、推定1RMは上がります。
            </Note>
          </Panel>

          <Panel title="次のセットの重量表" accent="var(--yellow)">
            <div className="table-wrap">
              <table className="table table--matrix">
                <thead>
                  <tr>
                    <th scope="col">RPE</th>
                    {Array.from({ length: 8 }, (_, i) => (
                      <th scope="col" key={i}>
                        {i + 1}回
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row[0].rpe} className={row[0].rpe === rpe ? 'is-current' : ''}>
                      <th scope="row">{row[0].rpe}</th>
                      {row.map((cell) => (
                        <td
                          key={cell.reps}
                          className={`num${cell.rpe === rpe && cell.reps === Math.round(repsNum ?? 0) ? ' is-hit' : ''}`}
                        >
                          {cell.weight != null ? fmt(roundTo(cell.weight, increment || 0.1)) : `${cell.percent}%`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>単位はkg。色が付いたセルが今入力しているセットです。</Note>
          </Panel>
        </>
      ) : (
        <EmptyState>重量・回数・RPEを入れると、推定1RMと次に組む重量が出ます。</EmptyState>
      )}
    </div>
  );
}
