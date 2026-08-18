import { useMemo } from 'react';
import {
  SearchField,
  NumberField,
  Panel,
  EmptyState,
  BigNumber,
  CopyButton,
  Note,
} from '../components/ui';
import {
  FOOD_SOURCE,
  categorySummaries,
  findFood,
  foodsInCategory,
  isEstimated,
  scaleFood,
  searchFoods,
  type Food,
  type NutrientKey,
} from '../lib/foods';
import { parseNumber, fmt, fmtComma } from '../lib/format';
import { usePersistentState } from '../lib/storage';

const RESULT_LIMIT = 40;

/** 絵文字が無い食品でも名前の左端が揃うよう、枠は常に出す */
function FoodEmoji({ emoji }: { emoji: string | null }) {
  return (
    <span className="food__emoji" aria-hidden={emoji ? undefined : true}>
      {emoji ?? ''}
    </span>
  );
}

function nutrientLabel(key: NutrientKey): string {
  switch (key) {
    case 'kcal':
      return 'エネルギー';
    case 'protein':
      return 'タンパク質';
    case 'fat':
      return '脂質';
    case 'carbs':
      return '炭水化物';
    case 'fiber':
      return '食物繊維';
    case 'salt':
      return '食塩相当量';
  }
}

function FoodList({
  foods,
  selectedId,
  onSelect,
}: {
  foods: Food[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="foodlist">
      {foods.map((food) => (
        <li key={food.id}>
          <button
            type="button"
            className={`foodrow${food.id === selectedId ? ' is-active' : ''}`}
            aria-pressed={food.id === selectedId}
            onClick={() => onSelect(food.id)}
          >
            <FoodEmoji emoji={food.emoji} />
            <span className="foodrow__body">
              <span className="foodrow__name">{food.name}</span>
              <span className="foodrow__macro">
                P {fmt(food.protein, 1)} / F {fmt(food.fat, 1)} / C {fmt(food.carbs, 1)}
              </span>
            </span>
            <span className="foodrow__kcal">
              {fmtComma(food.kcal)}
              <small>kcal</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FoodTool() {
  const [query, setQuery] = usePersistentState('food.query', '');
  const [category, setCategory] = usePersistentState<string | null>('food.category', null);
  const [selectedId, setSelectedId] = usePersistentState<string | null>('food.selected', null);
  const [grams, setGrams] = usePersistentState('food.grams', '100');

  const isSearching = query.trim() !== '';
  const categories = useMemo(() => categorySummaries(), []);

  // カテゴリを選んでいる間は、その中だけを検索する（AND）。
  // 0件になったときだけ、全カテゴリへ広げる導線を出す。
  const results = useMemo(
    () => (isSearching ? searchFoods(query, { limit: RESULT_LIMIT, category }) : []),
    [query, category, isSearching],
  );
  const wholeDbHits = useMemo(
    () => (isSearching && category && results.length === 0 ? searchFoods(query, { limit: 1 }).length : 0),
    [query, category, isSearching, results.length],
  );

  const categoryFoods = useMemo(() => (category ? foodsInCategory(category) : []), [category]);
  const currentCategory = categories.find((c) => c.name === category) ?? null;

  const selected = selectedId ? findFood(selectedId) : null;

  const gramsNum = parseNumber(grams);
  const gramsError =
    grams.trim() === ''
      ? '分量を入力してください'
      : gramsNum == null || gramsNum < 0 || gramsNum > 5000
        ? '0〜5000gで入力してください'
        : null;

  const scaled = useMemo(() => {
    if (!selected || gramsError || gramsNum == null) return null;
    return scaleFood(selected, gramsNum);
  }, [selected, gramsNum, gramsError]);

  const copyText = useMemo(() => {
    if (!selected || !scaled) return '';
    return [
      `${selected.emoji ? `${selected.emoji} ` : ''}${selected.name} ${fmt(gramsNum, 0)}g`,
      `${fmtComma(scaled.kcal)}kcal / P ${fmt(scaled.protein, 1)}g / F ${fmt(scaled.fat, 1)}g / C ${fmt(scaled.carbs, 1)}g`,
      `出典: ${FOOD_SOURCE.publisher}「${FOOD_SOURCE.title}」${selected.officialName}（食品番号 ${selected.id}）`,
    ].join('\n');
  }, [selected, scaled, gramsNum]);

  const estimatedKeys = selected?.estimated ?? [];

  return (
    <div className="tool">
      <Panel title="食品を探す" accent="var(--green)">
        <SearchField
          label="食品名で検索"
          value={query}
          onChange={setQuery}
          placeholder="鶏むね / まぐろ / ブロッコリー"
          hint={
            category
              ? `「${category}」の中から探します`
              : 'ひらがな・カタカナ・食品番号のどれでも引けます'
          }
        />

        {isSearching ? (
          results.length > 0 ? (
            <>
              <FoodList foods={results} selectedId={selectedId} onSelect={setSelectedId} />
              <p className="foodlist__meta">
                {category && `${category}の中から `}
                {results.length}件を表示（100gあたり）
                {results.length === RESULT_LIMIT && ' — 絞り込むと残りも出ます'}
              </p>
            </>
          ) : (
            <>
              <EmptyState>
                {category
                  ? `「${category}」の中に「${query}」に一致する食品がありません。`
                  : `「${query}」に一致する食品がありません。`}
              </EmptyState>
              {/* カテゴリで絞ったせいで0件になった場合の逃げ道 */}
              {wholeDbHits > 0 && (
                <button type="button" className="linkbutton" onClick={() => setCategory(null)}>
                  すべてのカテゴリから「{query}」を検索する
                </button>
              )}
            </>
          )
        ) : category ? (
          <>
            <button type="button" className="linkbutton" onClick={() => setCategory(null)}>
              ‹ カテゴリ一覧に戻る
            </button>
            <h3 className="food__cathead">
              <FoodEmoji emoji={currentCategory?.emoji ?? null} />
              <span>{category}</span>
              <small>{categoryFoods.length}件</small>
            </h3>
            <FoodList foods={categoryFoods} selectedId={selectedId} onSelect={setSelectedId} />
          </>
        ) : (
          <>
            <span className="field__label">カテゴリから選ぶ</span>
            <ul className="catlist">
              {categories.map((c) => (
                <li key={c.name}>
                  <button type="button" className="catrow" onClick={() => setCategory(c.name)}>
                    <FoodEmoji emoji={c.emoji} />
                    <span className="catrow__name">{c.name}</span>
                    <span className="catrow__count">
                      {c.count}
                      <small>件</small>
                    </span>
                    <span className="catrow__chevron" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Note>
              日本食品標準成分表（八訂）増補2023年から、筋トレでよく使う300食品を収録しています。
            </Note>
          </>
        )}
      </Panel>

      {selected ? (
        <Panel
          title="食品の詳細"
          accent="var(--blue)"
          action={<CopyButton text={copyText} label="内容をコピー" />}
        >
          <h3 className="food__title">
            <FoodEmoji emoji={selected.emoji} />
            <span>{selected.name}</span>
          </h3>

          <NumberField
            label="分量"
            unit="g"
            value={grams}
            onChange={setGrams}
            step={10}
            min={0}
            error={gramsError}
          />

          {scaled ? (
            <>
              <BigNumber
                value={fmtComma(scaled.kcal)}
                unit="kcal"
                caption={`${fmt(gramsNum, 0)}gあたりのエネルギー`}
              />

              <dl className="stats">
                {(['protein', 'fat', 'carbs', 'fiber', 'salt'] as NutrientKey[]).map((key) => (
                  <div key={key}>
                    <dt>
                      {nutrientLabel(key)}
                      {isEstimated(selected, key) && (
                        <span className="food__estimate" title="成分表で推定値として収載">
                          推定
                        </span>
                      )}
                    </dt>
                    <dd>
                      {fmt(scaled[key], key === 'salt' ? 2 : 1)}
                      <small>g</small>
                    </dd>
                  </div>
                ))}
              </dl>

              {/* 100gちょうどのときは左右が同じ値になるだけなので出さない */}
              {gramsNum !== 100 && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>成分</th>
                      <th className="num">100gあたり</th>
                      <th className="num">{fmt(gramsNum, 0)}gあたり</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['kcal', 'protein', 'fat', 'carbs'] as NutrientKey[]).map((key) => (
                      <tr key={key}>
                        <th>{nutrientLabel(key)}</th>
                        <td className="num">
                          {fmt(selected[key], key === 'kcal' ? 0 : 1)}
                          <small>{key === 'kcal' ? 'kcal' : 'g'}</small>
                        </td>
                        <td className="num strong">
                          {fmt(scaled[key], key === 'kcal' ? 0 : 1)}
                          <small>{key === 'kcal' ? 'kcal' : 'g'}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <EmptyState>分量を入れると、その量あたりの成分が出ます。</EmptyState>
          )}

          <Note>
            出典: {FOOD_SOURCE.publisher}「{FOOD_SOURCE.title}」{FOOD_SOURCE.section}／
            収載名「{selected.officialName}」（食品番号 {selected.id}）。数値は{FOOD_SOURCE.basis}の収載値です。
            {estimatedKeys.length > 0 &&
              `「推定」の付いた項目（${estimatedKeys.map(nutrientLabel).join('・')}）は成分表で推定値として収載されているものです。`}
            エネルギーは成分表の収載値であり、PFCから再計算した値ではありません。
          </Note>
        </Panel>
      ) : (
        <EmptyState>食品を選ぶと、分量あたりの成分が出ます。</EmptyState>
      )}
    </div>
  );
}
