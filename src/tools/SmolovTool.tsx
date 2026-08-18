import { useMemo } from 'react';
import { NumberField, Segmented, Panel, EmptyState, CopyButton, Note } from '../components/ui';
import { buildSmolov, smolovToText, type SmolovVariant } from '../lib/smolov';
import { parseNumber, fmt, fmtComma } from '../lib/format';
import { usePersistentState } from '../lib/storage';

const EXERCISES = ['スクワット', 'ベンチプレス', 'デッドリフト'] as const;

export function SmolovTool() {
  const [oneRM, setOneRM] = usePersistentState('smolov.onerm', '120');
  const [variant, setVariant] = usePersistentState<SmolovVariant>('smolov.variant', 'jr');
  const [exercise, setExercise] = usePersistentState<string>('smolov.exercise', 'ベンチプレス');
  const [weekly, setWeekly] = usePersistentState<number>('smolov.weekly', 2.5);
  const [rounding, setRounding] = usePersistentState<number>('smolov.rounding', 2.5);

  const oneRmNum = parseNumber(oneRM);
  const oneRmError =
    oneRM.trim() === ''
      ? '1RMを入力してください'
      : oneRmNum == null
        ? '数値で入力してください'
        : oneRmNum <= 0
          ? '0より大きい値を入力してください'
          : oneRmNum > 600
            ? '600kg以下で入力してください'
            : null;

  const plan = useMemo(() => {
    if (oneRmError || oneRmNum == null) return null;
    return buildSmolov(oneRmNum, variant, {
      weeklyIncrement: weekly,
      roundingIncrement: rounding,
      testWeek: true,
    });
  }, [oneRmNum, variant, weekly, rounding, oneRmError]);

  const copyText = plan ? smolovToText(plan, exercise) : '';

  return (
    <div className="tool">
      <Panel title="プログラム設定" accent="var(--blue)">
        <Segmented
          label="種目"
          value={exercise}
          onChange={setExercise}
          options={EXERCISES.map((e) => ({ value: e, label: e }))}
        />
        <NumberField
          label="現在の1RM"
          unit="kg"
          value={oneRM}
          onChange={setOneRM}
          step={2.5}
          min={0}
          error={oneRmError}
        />
        <Segmented
          label="サイクル"
          value={variant}
          onChange={setVariant}
          options={[
            { value: 'jr', label: 'Smolov Jr.', sub: '週4日・4週' },
            { value: 'base', label: 'ベースサイクル', sub: '高ボリューム' },
          ]}
        />
        <div className="grid grid--2">
          <Segmented
            label="週ごとの増加"
            value={weekly}
            onChange={setWeekly}
            options={[
              { value: 2.5, label: '+2.5kg' },
              { value: 5, label: '+5kg' },
            ]}
          />
          <Segmented
            label="重量の丸め"
            value={rounding}
            onChange={setRounding}
            options={[
              { value: 1.25, label: '1.25kg' },
              { value: 2.5, label: '2.5kg' },
            ]}
          />
        </div>
        <Note>
          ベンチは +2.5kg、スクワットは +5kg が目安です。週4日すべてを同じ種目に使うプログラムです。
        </Note>
      </Panel>

      {plan ? (
        <>
          <Panel
            title={`${exercise}の4週プラン`}
            accent="var(--yellow)"
            action={<CopyButton text={copyText} label="プランをコピー" />}
          >
            <dl className="stats">
              <div>
                <dt>総挙上重量</dt>
                <dd>
                  {fmtComma(plan.tonnage)}
                  <small>kg</small>
                </dd>
              </div>
              <div>
                <dt>総レップ数</dt>
                <dd>
                  {fmtComma(plan.totalReps)}
                  <small>回</small>
                </dd>
              </div>
              <div>
                <dt>目標1RM</dt>
                <dd>
                  {fmt(plan.oneRM + plan.increment * 3)}
                  <small>kg</small>
                </dd>
              </div>
            </dl>

            {plan.weeks.map((week) => (
              <div key={week.week} className={`week${week.isTestWeek ? ' week--test' : ''}`}>
                <div className="week__head">
                  <h3>
                    {week.label}
                    {!week.isTestWeek && <span className="week__max">基準 {fmt(week.workingMax)}kg</span>}
                  </h3>
                  <p>{week.note}</p>
                </div>
                <ul className="daylist">
                  {week.days.map((day) => (
                    <li key={day.label} className="daylist__item">
                      <span className="daylist__day">{day.label}</span>
                      {week.isTestWeek ? (
                        <span className="daylist__scheme">新1RM測定（目標 {fmt(day.weight)}kg）</span>
                      ) : (
                        <>
                          <span className="daylist__scheme">
                            <strong>{fmt(day.weight)}kg</strong> × {day.reps}回 × {day.sets}セット
                          </span>
                          <span className="daylist__meta">
                            {day.percent}% / {fmtComma(day.tonnage)}kg
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Panel>
          <Note>
            きついプログラムです。フォームが崩れる、関節が痛む、回復が追いつかない場合は中断してください。
          </Note>
        </>
      ) : (
        <EmptyState>1RMを入れると、4週分の重量・セット数が確定します。</EmptyState>
      )}
    </div>
  );
}
