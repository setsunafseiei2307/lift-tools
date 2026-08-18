import { useMemo } from 'react';
import { NumberField, Segmented, Panel, EmptyState, BigNumber, CopyButton, Note, Disclosure } from '../components/ui';
import { estimateOneRM, repTableFromOneRM, MAX_REPS } from '../lib/onerm';
import { parseNumber, fmt } from '../lib/format';
import { usePersistentState } from '../lib/storage';

export function OneRmTool() {
  const [weight, setWeight] = usePersistentState('1rm.weight', '100');
  const [reps, setReps] = usePersistentState('1rm.reps', '5');
  const [increment, setIncrement] = usePersistentState<number>('1rm.increment', 2.5);

  const weightNum = parseNumber(weight);
  const repsNum = parseNumber(reps);

  const weightError =
    weight.trim() === ''
      ? '重量を入力してください'
      : weightNum == null
        ? '数値で入力してください'
        : weightNum <= 0
          ? '0より大きい値を入力してください'
          : weightNum > 1000
            ? '1000kg以下で入力してください'
            : null;

  const repsError =
    reps.trim() === ''
      ? '回数を入力してください'
      : repsNum == null
        ? '数値で入力してください'
        : repsNum < 1
          ? '1回以上で入力してください'
          : repsNum > MAX_REPS
            ? `${MAX_REPS}回を超えると推定がずれます。${MAX_REPS}回以下で入力してください`
            : null;

  const estimate = useMemo(() => {
    if (weightError || repsError || weightNum == null || repsNum == null) return null;
    return estimateOneRM(weightNum, repsNum);
  }, [weightNum, repsNum, weightError, repsError]);

  const table = useMemo(
    () => (estimate ? repTableFromOneRM(estimate.average, increment) : []),
    [estimate, increment],
  );

  const copyText = useMemo(() => {
    if (!estimate) return '';
    const head = `推定1RM ${fmt(estimate.average)}kg（${fmt(weightNum ?? 0)}kg × ${repsNum}回から算出）`;
    const rows = table.map((r) => `${r.reps}回: ${fmt(r.weight)}kg (${r.percent}%)`);
    return [head, '', ...rows].join('\n');
  }, [estimate, table, weightNum, repsNum]);

  return (
    <div className="tool">
      <Panel title="挙げた重量と回数" accent="var(--blue)">
        <div className="grid grid--2">
          <NumberField
            label="重量"
            unit="kg"
            value={weight}
            onChange={setWeight}
            step={2.5}
            min={0}
            error={weightError}
            placeholder="100"
          />
          <NumberField
            label="回数"
            unit="回"
            value={reps}
            onChange={setReps}
            step={1}
            min={1}
            max={MAX_REPS}
            error={repsError}
            placeholder="5"
            inputMode="numeric"
          />
        </div>
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

      {estimate ? (
        <>
          <Panel
            title="推定1RM"
            accent="var(--blue)"
            action={<CopyButton text={copyText} />}
          >
            <BigNumber value={fmt(estimate.average)} unit="kg" caption="7つの計算式の平均" />
            <p className="range">
              式によって {fmt(estimate.min)}kg 〜 {fmt(estimate.max)}kg（幅 {fmt(estimate.spread)}kg）
            </p>
            <Note>
              回数が多いほど誤差が大きくなります。5回以下で測ると精度が上がります。
            </Note>
            {/* 7式の内訳は普段は不要なので畳んでおく。数字が多いと平均値が埋もれるため */}
            <Disclosure summary="7つの式それぞれの推定値を見る">
              <ul className="formula-list formula-list--bare">
                {estimate.results.map((r) => (
                  <li key={r.name}>
                    <span className="formula-list__name">{r.name}</span>
                    <span className="formula-list__value">{fmt(r.value)}<small>kg</small></span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          </Panel>

          <Panel title="レップ数ごとの目安重量" accent="var(--yellow)">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">回数</th>
                    <th scope="col">%1RM</th>
                    <th scope="col">重量</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => (
                    <tr key={row.reps} className={row.reps === Math.round(repsNum ?? 0) ? 'is-current' : ''}>
                      <th scope="row">{row.reps}回</th>
                      <td className="num">{row.percent}%</td>
                      <td className="num strong">{fmt(row.weight)}kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState>重量と回数を入れると、推定1RMとレップ別の重量表が出ます。</EmptyState>
      )}
    </div>
  );
}
