import { useMemo } from 'react';
import {
  NumberField,
  Segmented,
  Panel,
  EmptyState,
  BigNumber,
  CopyButton,
  Note,
  Warning,
} from '../components/ui';
import {
  ACTIVITY_LEVELS,
  GOAL_PRESETS,
  bmi,
  calcMacros,
  leanBodyMass,
  type BmrFormula,
  type Sex,
} from '../lib/nutrition';
import { parseNumber, fmt, fmtComma } from '../lib/format';
import { usePersistentState } from '../lib/storage';

export function NutritionTool() {
  const [sex, setSex] = usePersistentState<Sex>('pfc.sex', 'male');
  const [age, setAge] = usePersistentState('pfc.age', '35');
  const [height, setHeight] = usePersistentState('pfc.height', '172');
  const [weight, setWeight] = usePersistentState('pfc.weight', '70');
  const [bodyFat, setBodyFat] = usePersistentState('pfc.bodyfat', '');
  const [activity, setActivity] = usePersistentState<string>('pfc.activity', 'moderate');
  const [goal, setGoal] = usePersistentState<string>('pfc.goal', 'cut');
  const [formula, setFormula] = usePersistentState<BmrFormula>('pfc.formula', 'mifflin');
  const [proteinPerKg, setProteinPerKg] = usePersistentState<number>('pfc.protein', 2.0);
  const [fatPercent, setFatPercent] = usePersistentState<number>('pfc.fat', 25);

  const ageNum = parseNumber(age);
  const heightNum = parseNumber(height);
  const weightNum = parseNumber(weight);
  const bodyFatNum = bodyFat.trim() === '' ? null : parseNumber(bodyFat);

  const ageError =
    age.trim() === '' ? '年齢を入力してください' : ageNum == null || ageNum < 10 || ageNum > 100 ? '10〜100で入力してください' : null;
  const heightError =
    height.trim() === '' ? '身長を入力してください' : heightNum == null || heightNum < 100 || heightNum > 250 ? '100〜250cmで入力してください' : null;
  const weightError =
    weight.trim() === '' ? '体重を入力してください' : weightNum == null || weightNum < 25 || weightNum > 300 ? '25〜300kgで入力してください' : null;
  const bodyFatError =
    bodyFat.trim() !== '' && (bodyFatNum == null || bodyFatNum < 2 || bodyFatNum > 60)
      ? '2〜60%で入力してください'
      : formula === 'katch' && bodyFatNum == null
        ? 'Katch-McArdle式には体脂肪率が必要です'
        : null;

  const activityLevel = ACTIVITY_LEVELS.find((a) => a.key === activity) ?? ACTIVITY_LEVELS[2];
  const goalPreset = GOAL_PRESETS.find((g) => g.key === goal) ?? GOAL_PRESETS[2];

  const valid = !ageError && !heightError && !weightError && !bodyFatError;

  const result = useMemo(() => {
    if (!valid || ageNum == null || heightNum == null || weightNum == null) return null;
    return calcMacros(
      {
        sex,
        age: ageNum,
        heightCm: heightNum,
        weightKg: weightNum,
        bodyFatPercent: bodyFatNum,
      },
      activityLevel.factor,
      goalPreset.ratio,
      formula,
      { proteinPerKg, fatPercent },
    );
  }, [valid, sex, ageNum, heightNum, weightNum, bodyFatNum, activityLevel, goalPreset, formula, proteinPerKg, fatPercent]);

  const bmiValue = weightNum && heightNum ? bmi(weightNum, heightNum) : null;
  const lbm = weightNum && bodyFatNum != null ? leanBodyMass(weightNum, bodyFatNum) : null;

  const copyText = useMemo(() => {
    if (!result) return '';
    return [
      `目標: ${goalPreset.label}（${goalPreset.detail}）`,
      `基礎代謝 ${fmtComma(result.bmr)}kcal / 消費カロリー ${fmtComma(result.tdee)}kcal`,
      `摂取カロリー ${fmtComma(result.targetCalories)}kcal`,
      `P ${fmt(result.protein.grams, 0)}g / F ${fmt(result.fat.grams, 0)}g / C ${fmt(result.carbs.grams, 0)}g`,
    ].join('\n');
  }, [result, goalPreset]);

  return (
    <div className="tool">
      <Panel title="体のデータ" accent="var(--green)">
        <Segmented
          label="性別"
          value={sex}
          onChange={setSex}
          options={[
            { value: 'male', label: '男性' },
            { value: 'female', label: '女性' },
          ]}
        />
        <div className="grid grid--3">
          <NumberField label="年齢" unit="歳" value={age} onChange={setAge} step={1} min={10} error={ageError} inputMode="numeric" />
          <NumberField label="身長" unit="cm" value={height} onChange={setHeight} step={1} min={100} error={heightError} />
          <NumberField label="体重" unit="kg" value={weight} onChange={setWeight} step={0.5} min={25} error={weightError} />
        </div>
        <NumberField
          label="体脂肪率（任意）"
          unit="%"
          value={bodyFat}
          onChange={setBodyFat}
          step={0.5}
          min={0}
          error={bodyFatError}
          hint="入力すると除脂肪体重とKatch-McArdle式が使えます"
          placeholder="未入力でもOK"
        />
      </Panel>

      <Panel title="活動量と目標" accent="var(--yellow)">
        <Segmented
          label="1週間の運動量"
          value={activity}
          onChange={setActivity}
          minItemWidth={110}
          options={ACTIVITY_LEVELS.map((a) => ({ value: a.key, label: a.label, sub: a.detail }))}
        />
        <Segmented
          label="目標"
          value={goal}
          onChange={(next) => {
            setGoal(next);
            const preset = GOAL_PRESETS.find((g) => g.key === next);
            if (preset) setProteinPerKg(preset.protein);
          }}
          minItemWidth={96}
          options={GOAL_PRESETS.map((g) => ({ value: g.key, label: g.label, sub: g.detail }))}
        />
      </Panel>

      {result ? (
        <>
          <Panel title="1日の摂取量" accent="var(--green)" action={<CopyButton text={copyText} />}>
            <BigNumber value={fmtComma(result.targetCalories)} unit="kcal" caption={`${goalPreset.label}のための摂取カロリー`} />

            <div className="macro">
              <div className="macro__bar" role="img" aria-label="PFCの比率">
                <span className="macro__seg macro__seg--p" style={{ width: `${result.protein.percent}%` }} />
                <span className="macro__seg macro__seg--f" style={{ width: `${result.fat.percent}%` }} />
                <span className="macro__seg macro__seg--c" style={{ width: `${result.carbs.percent}%` }} />
              </div>
              <ul className="macro__list">
                <li>
                  <span className="macro__dot macro__dot--p" />
                  <span className="macro__name">タンパク質</span>
                  <span className="macro__value">{fmt(result.protein.grams, 0)}<small>g</small></span>
                  <span className="macro__sub">{fmt(result.protein.percent, 0)}% / {fmtComma(result.protein.kcal)}kcal</span>
                </li>
                <li>
                  <span className="macro__dot macro__dot--f" />
                  <span className="macro__name">脂質</span>
                  <span className="macro__value">{fmt(result.fat.grams, 0)}<small>g</small></span>
                  <span className="macro__sub">{fmt(result.fat.percent, 0)}% / {fmtComma(result.fat.kcal)}kcal</span>
                </li>
                <li>
                  <span className="macro__dot macro__dot--c" />
                  <span className="macro__name">炭水化物</span>
                  <span className="macro__value">{fmt(result.carbs.grams, 0)}<small>g</small></span>
                  <span className="macro__sub">{fmt(result.carbs.percent, 0)}% / {fmtComma(result.carbs.kcal)}kcal</span>
                </li>
              </ul>
            </div>

            <Warning items={result.warnings} />

            <dl className="stats">
              <div>
                <dt>基礎代謝</dt>
                <dd>{fmtComma(result.bmr)}<small>kcal</small></dd>
              </div>
              <div>
                <dt>消費カロリー</dt>
                <dd>{fmtComma(result.tdee)}<small>kcal</small></dd>
              </div>
              <div>
                <dt>週の体重変化</dt>
                <dd>
                  {result.weeklyWeightChangeKg > 0 ? '+' : ''}
                  {fmt(result.weeklyWeightChangeKg, 2)}
                  <small>kg</small>
                </dd>
              </div>
              {bmiValue && (
                <div>
                  <dt>BMI</dt>
                  <dd>{fmt(bmiValue, 1)}</dd>
                </div>
              )}
              {lbm && (
                <div>
                  <dt>除脂肪体重</dt>
                  <dd>{fmt(lbm, 1)}<small>kg</small></dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="計算の設定" accent="var(--muted)">
            <Segmented
              label="基礎代謝の計算式"
              value={formula}
              onChange={setFormula}
              options={[
                { value: 'mifflin', label: 'Mifflin', sub: '標準' },
                { value: 'harris', label: 'Harris', sub: '旧来式' },
                { value: 'katch', label: 'Katch', sub: '体脂肪率必要' },
              ]}
            />
            <Segmented
              label="タンパク質（体重1kgあたり）"
              value={proteinPerKg}
              onChange={setProteinPerKg}
              options={[1.6, 1.8, 2.0, 2.2, 2.5].map((v) => ({ value: v, label: `${v}g` }))}
            />
            <Segmented
              label="脂質の割合"
              value={fatPercent}
              onChange={setFatPercent}
              options={[20, 25, 30, 35].map((v) => ({ value: v, label: `${v}%` }))}
            />
            <Note>
              炭水化物は「摂取カロリー − タンパク質 − 脂質」で自動計算されます。脂質は体重1kgあたり0.7gを下回らないように調整します。
            </Note>
          </Panel>
        </>
      ) : (
        <EmptyState>体のデータを入れると、1日の摂取カロリーとPFCが出ます。</EmptyState>
      )}
    </div>
  );
}
