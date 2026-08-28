# lift-tools 現状棚卸し

作成日: 2026-08-28 / 対象コミット: `91c259f`（`main` から派生した `claude/lift-tools-inventory-hu11zs`）

このリポジトリは凍結予定。別リポジトリで新規に作るフィットネス系サイトへ、どのファイルを
持ち込めるかを判断するための事実整理。**改善案・提案は含まない。**

---

## 1. ディレクトリ構成と各ディレクトリの役割

```
lift-tools/
├─ index.html                  Viteのエントリ。<title>/meta/OGP/favicon(データURI)/Google Fonts読み込み
├─ package.json                npm設定（依存6件・スクリプト6件）
├─ tsconfig.json               TS設定（strict, jsx: react-jsx, types: vitest/globals）
├─ vite.config.ts              Vite設定 + Vitest設定（同一ファイルに同居）
├─ .github/workflows/deploy.yml  main push → npm ci → npm test → npm run build → GitHub Pages
├─ .gitattributes / .gitignore / LICENSE(MIT) / README.md
├─ docs/                       ドキュメント
│  └─ food-data.md             食品データの出典・記号の扱い・再生成手順・絵文字ルールの落とし穴
├─ scripts/food-data/          食品データ再生成スクリプト（Python 3 + openpyxl）。ビルドには不要
│  ├─ extract.py               成分表Excel → all_foods.json（全2,538食品）
│  ├─ selection.py             食品番号による300件の選定リスト（カテゴリ別）
│  ├─ build.py                 表示名・絵文字の付与 → selected_foods.json
│  └─ emit_ts.py               → src/lib/foodData.ts と src/test/foods-source.json を書き出す
└─ src/
   ├─ main.tsx                 createRoot / StrictMode / styles.css読み込み（15行）
   ├─ App.tsx                  6ツールのタブ切替、`#/xxx` ハッシュルーティング、テーマ切替（116行）
   ├─ styles.css               全画面分のCSS 1ファイル（1,250行）。:root のカスタムプロパティ +
   │                           [data-theme='dark'] でライト/ダーク。UIパーツ単位のセクション構成
   ├─ lib/                     計算ロジック層。UI非依存の純関数（storage.ts のみ例外）
   ├─ tools/                   ツールごとの画面。1ツール=1ファイル
   ├─ components/              共通UI部品（ui.tsx）とプレート図のSVG（Barbell.tsx）
   └─ test/                    Vitest のユニットテスト + 検証用の元データJSON
```

### レイヤ間の依存方向

- `tools/*` → `lib/*` + `components/*`（一方向。lib から tools/components への依存はゼロ）
- `lib/` 内の依存は `format.ts` を末端とする木構造のみ:
  - `format.ts` … 依存なし
  - `onerm.ts` / `rpe.ts` / `plates.ts` / `smolov.ts` / `nutrition.ts` → `format.ts`
  - `foods.ts` → `format.ts` + `foodData.ts`、`foodData.ts` → `foods.ts`（型のみ `import type`）
  - `storage.ts` … 依存なし（ただし React hooks を使用）

### ビルド成果物（`npm run build` 実測）

| ファイル | サイズ | gzip |
|---|---:|---:|
| `dist/assets/index-*.js` | 227.93 kB | 73.46 kB |
| `dist/assets/index-*.css` | 16.40 kB | 3.79 kB |
| `dist/index.html` | 1.71 kB | 0.92 kB |

---

## 2. 実装済み6ツール

計算ロジックはすべて `src/lib/` の純関数に分離されており、**UI内に埋まっている計算は無い**。
各 `tools/*.tsx` に残っているのは (a) 入力値のバリデーション範囲、(b) 表示用の文字列組み立て
（コピー用テキスト）、(c) 警告文の文言 のみ。

| # | ツール | 画面ファイル | 計算ロジックの場所 | UI側に残る処理 | テストファイル（件数） | React依存 |
|---|---|---|---|---|---|---|
| 1 | 1RM換算 | `src/tools/OneRmTool.tsx`（150行） | `src/lib/onerm.ts`（122行・純関数）<br>`estimateOneRM` / `repTableFromOneRM` / `weightAtPercent` / `percentOfOneRM` / `REP_PERCENT_TABLE` / `MAX_REPS` | 重量0〜1000kg・回数1〜12のバリデーション、コピー文言 | `src/test/onerm.test.ts`（20件） | lib: **無し** / 画面: 有り |
| 2 | RPE換算 | `src/tools/RpeTool.tsx`（142行） | `src/lib/rpe.ts`（86行・純関数）<br>`rpePercent` / `oneRmFromRpe` / `weightForRepsAtRpe` / `buildRpeMatrix` / `PERCENT_SEQUENCE`（1次元数列） | 表示時の `roundTo`、RPEチップのラベル生成 | `src/test/rpe.test.ts`（21件） | lib: **無し** / 画面: 有り |
| 3 | プレート計算 | `src/tools/PlateTool.tsx`（138行）<br>図: `src/components/Barbell.tsx`（106行・SVG） | `src/lib/plates.ts`（145行・純関数）<br>`calcPlates`（貪欲法） / `loadableWeights` / `kgToLb` / `lbToKg` / `KG_PLATES` / `LB_PLATES` / `BAR_OPTIONS` | 目標0〜1000のバリデーション、差分・バー未満の警告文 | `src/test/plates.test.ts`（25件） | lib: **無し** / 画面・図: 有り |
| 4 | Smolov | `src/tools/SmolovTool.tsx`（162行） | `src/lib/smolov.ts`（184行・純関数）<br>`buildSmolov` / `smolovToText` / `JR_DAYS` / `BASE_DAYS` / `WEEK_NOTES` | 1RM 0〜600kg のバリデーションのみ | `src/test/smolov.test.ts`（20件） | lib: **無し** / 画面: 有り |
| 5 | PFC・カロリー | `src/tools/NutritionTool.tsx`（240行） | `src/lib/nutrition.ts`（191行・純関数）<br>`calcBMR`(mifflin/harris/katch) / `calcMacros` / `leanBodyMass` / `bmi` / `weeksToGoal` / `ACTIVITY_LEVELS` / `GOAL_PRESETS` | 年齢10〜100・身長100〜250・体重25〜300・体脂肪2〜60のバリデーション、PFCバーの幅指定 | `src/test/nutrition.test.ts`（30件） | lib: **無し** / 画面: 有り |
| 6 | 食品検索 | `src/tools/FoodTool.tsx`（311行） | `src/lib/foods.ts`（274行・純関数）<br>`searchFoods` / `findFood` / `scaleFood` / `normalizeQuery` / `isEstimated` / `categorySummaries` / `foodsInCategory` / `foodCategories` / `FOOD_SOURCE`<br>データ: `src/lib/foodData.ts` | 分量0〜5000gのバリデーション、カテゴリ→検索のドリルダウン制御、出典文の組み立て | `src/test/foods.test.ts`（48件） | lib: **無し** / 画面: 有り |

共通ユーティリティ:

| ファイル | 役割 | テスト | React依存 |
|---|---|---|---|
| `src/lib/format.ts`（62行） | `isFiniteNumber` / `parseNumber`（全角数字・カンマ対応） / `roundTo` / `fmt` / `fmtComma` / `clamp` | `src/test/format.test.ts`（17件） | 無し |
| `src/lib/storage.ts`（58行） | localStorage ラッパー。`load` / `save` は React非依存だが、`usePersistentState` が `useState`/`useEffect`/`useCallback` を使う | 無し | **有り**（hooks） |
| `src/components/ui.tsx`（348行） | `NumberField` / `SearchField` / `Segmented` / `Panel` / `EmptyState` / `Note` / `Callout` / `Warning` / `CopyButton` / `BigNumber` / `Disclosure` | 無し | 有り |
| `src/components/Barbell.tsx`（106行） | プレート積みのSVG図。`lib/plates` からは型のみ `import type` | 無し | 有り（JSX / automatic runtime。`react` の明示 import は無い） |

localStorage のキー（すべて `lift-tools:` プレフィックス付き）:
`theme` / `1rm.weight` `1rm.reps` `1rm.increment` / `rpe.weight` `rpe.reps` `rpe.rpe` `rpe.increment` /
`plate.unit` `plate.target` `plate.bar` / `smolov.exercise` `smolov.onerm` `smolov.variant` `smolov.weekly` `smolov.rounding` /
`pfc.sex` `pfc.age` `pfc.height` `pfc.weight` `pfc.bodyfat` `pfc.activity` `pfc.goal` `pfc.formula` `pfc.protein` `pfc.fat` /
`food.query` `food.category` `food.selected` `food.grams`

---

## 3. 食品データ300件

### ファイル形式・場所・サイズ

| ファイル | 形式 | サイズ | 内容 |
|---|---|---:|---|
| `src/lib/foodData.ts` | TypeScript（`export const FOODS: readonly Food[]`。1食品=1行のオブジェクトリテラル） | 68,502 バイト（約67KB）/ 313行 | アプリが実際に読む本体。ヘッダに出典コメント8行 |
| `src/test/foods-source.json` | JSON（トップレベルは食品番号をキーにしたオブジェクト） | 51,854 バイト（約51KB）/ 2,702行 | 元Excelからの抽出値。テスト専用でアプリからは読まない |
| `scripts/food-data/selection.py` | Python（食品番号リスト） | 358行 | どの300件を収録するかの定義 |
| `scripts/food-data/build.py` | Python（表示名・絵文字ルール） | 262行 | `DISPLAY_NAME` / `EMOJI_RULES` / `EMOJI_OVERRIDE` |

DB・APIは使っておらず、300件はJSバンドルに静的に埋め込まれる（gzip後の寄与は約50KB相当）。

### 型定義（`src/lib/foods.ts` の `Food` インターフェース）

| フィールド | 型 | 用途 | 300件中のnull数 |
|---|---|---|---:|
| `id` | `string` | 日本食品標準成分表の**食品番号**（5桁ゼロ埋め、例 `'11227'`）。主キー・出典追跡・検索対象 | 0（全件ユニーク） |
| `name` | `string` | 検索・表示に使う日本語名（成分表の階層名を平易に書き換えたもの、例「ごはん（精白米）」） | 0 |
| `emoji` | `string \| null` | 一覧の行頭に出す絵文字。該当が無ければ `null` | 61件が `null` |
| `category` | `string` | 16カテゴリのいずれか（下表） | 0 |
| `kcal` | `number \| null` | エネルギー（可食部100gあたり kcal） | 0 |
| `protein` | `number \| null` | たんぱく質 g/100g | 0 |
| `fat` | `number \| null` | 脂質 g/100g | 0 |
| `carbs` | `number \| null` | 炭水化物 g/100g | 0 |
| `fiber` | `number \| null` | 食物繊維総量 g/100g | 3件が `null` |
| `salt` | `number \| null` | 食塩相当量 g/100g | 0 |
| `officialName` | `string` | 成分表の**収載名**をそのまま保持（例 `'こめ [水稲めし] 精白米 うるち米'`）。出典表示と検索対象 | 0 |
| `estimated` | `NutrientKey[]`（任意） | 成分表で括弧付き＝推定値だった項目名の配列。UIに「推定」バッジを出す | 134件が保持、166件は未定義 |

`NutrientKey = 'kcal' | 'protein' | 'fat' | 'carbs' | 'fiber' | 'salt'`

### カテゴリ内訳（16カテゴリ・計300件、データ出現順）

| カテゴリ | 件数 | カテゴリ | 件数 |
|---|---:|---|---:|
| 穀類・主食 | 32 | 魚介類 | 48 |
| いも・でん粉 | 9 | 肉類 | 55 |
| 砂糖・甘味 | 3 | 卵類 | 8 |
| 豆類 | 19 | 乳類 | 17 |
| 種実類 | 8 | 油脂類 | 7 |
| 野菜類 | 43 | し好飲料 | 4 |
| 果実類 | 19 | 調味料 | 13 |
| きのこ類 | 8 | 藻類 | 7 |

### 出典情報の持たせ方

出典は3層で保持されている。

1. **データ1件ごと** — `id`（食品番号）と `officialName`（収載名）を全件に持たせ、元データまで遡れるようにしている。
2. **データセット全体** — `src/lib/foods.ts` の定数 `FOOD_SOURCE`:
   ```ts
   { title: '日本食品標準成分表（八訂）増補2023年',
     publisher: '文部科学省',
     section: '第2章（データ）本表',
     url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
     basis: '可食部100gあたり' }
   ```
3. **ファイル先頭コメント** — `foodData.ts` の8行のヘッダ（自動生成である旨・出典URL・推測値を含まない旨）。

UI側では `src/tools/FoodTool.tsx` が食品詳細の下部に
「出典: 文部科学省「…」第2章（データ）本表／収載名「…」（食品番号 …）。数値は可食部100gあたりの収載値です。」
を表示し、コピー用テキストにも出典行を含めている。

元ファイルは `20260327-mxt_kagsei-mext-000029402_02.xlsx`（約1.9MB / 全2,538食品）。**リポジトリには含まれていない**
（`.gitignore` で `scripts/food-data/*.xlsx` を除外）ため、再生成には文科省サイトからの再ダウンロードが要る。

成分表の記号の扱い: `-`（未測定）→ `null`、`Tr`（微量）→ `0`、`(12.3)`（推定値）→ `12.3` + `estimated` に記録、空欄 → `null`。

**カロリーはPFCから再計算していない。** 八訂はエネルギーを組成成分ベースで算出しており（食物繊維 約2kcal/g、
アルコール 7kcal/g）、`P×4+F×9+C×4` では収載値と一致しない（300件中34件で25%以上乖離）。
`scaleFood()` は収載値をグラム数に比例させるだけ。この挙動は `src/test/foods.test.ts` で固定されている。

### emoji / image_key の使われ方

- **`image_key` というフィールドは存在しない。** リポジトリ全体（`.ts` / `.tsx` / `.py` / `.json` / `.md` / `.css`）を
  `image_key` / `imageKey` / `image` で検索してもヒットゼロ。画像ファイルも同梱していない（`.gitattributes` に
  `*.png` `*.jpg` のバイナリ指定はあるが、実ファイルは無い）。ビジュアルはすべて絵文字とインラインSVGで賄っている。
- **`emoji`（食品ごと）** — `string | null`。239件が絵文字あり、61件が `null`（豆腐・こんにゃく・しょうゆ・のり など）。
  「近いけれど別の食品」の絵文字は当てない方針（カリフラワーに🥦を使わない）。
  付与は `scripts/food-data/build.py` の `EMOJI_RULES`（キーワード一致）と `EMOJI_OVERRIDE`（個別打ち消し）で機械的に行い、
  部分一致の誤爆（「牛もも」が🍑、「マヨネーズ（全卵型）」が🥚 など）を個別に潰した経緯が `docs/food-data.md` に残っている。
- 表示は `src/tools/FoodTool.tsx` の `FoodEmoji` コンポーネント。`null` のときは空文字を描画し、`aria-hidden` を付ける。
  CSSの `.food__emoji` は空でも幅を確保するので、絵文字の有無で名前の左端がずれない。
- **カテゴリ絵文字は別系統** — `src/lib/foods.ts` の `CATEGORY_EMOJI`（16カテゴリぶん、🍚🥔🍯🫘🥜🥬🍎🍄🍥🐟🥩🥚🥛🧈🍵🧂）。
  個々の食品の `emoji` とは独立に選ばれており、カテゴリ一覧の飾りにのみ使う。

---

## 4. package.json の依存関係

実行時依存2件、開発依存6件のみ。状態管理・UIフレームワーク・チャート・日付ライブラリの類は一切入っていない。

### dependencies

| パッケージ | バージョン | 用途 |
|---|---|---|
| `react` | `^18.3.1` | UI本体。hooks（`useState` / `useEffect` / `useMemo` / `useCallback` / `useId` / `useRef`）と `StrictMode` |
| `react-dom` | `^18.3.1` | `createRoot` によるDOMへのマウント（`src/main.tsx`） |

### devDependencies

| パッケージ | バージョン | 用途 |
|---|---|---|
| `@types/react` | `^18.3.12` | Reactの型定義 |
| `@types/react-dom` | `^18.3.1` | react-domの型定義 |
| `@vitejs/plugin-react` | `^4.3.4` | ViteでのJSX変換・Fast Refresh |
| `typescript` | `^5.6.3` | 型チェック（`tsc -b`）。`strict` + `noUnusedLocals` + `noUnusedParameters` |
| `vite` | `^5.4.11` | 開発サーバとプロダクションビルド（`base: './'` で任意のサブディレクトリに配置可） |
| `vitest` | `^2.1.8` | ユニットテスト。設定は `vite.config.ts` の `test` に同居（`environment: 'node'`） |

### scripts

| スクリプト | 中身 | 用途 |
|---|---|---|
| `dev` | `vite` | 開発サーバ（http://localhost:5173） |
| `build` | `tsc -b && vite build` | 型チェック後に `dist/` へ出力 |
| `preview` | `vite preview` | ビルド結果のローカル確認 |
| `test` | `vitest run` | テスト1回実行 |
| `test:watch` | `vitest` | 監視実行 |
| `typecheck` | `tsc -b --noEmit false --emitDeclarationOnly false` | 型チェック単体 |

Pythonスクリプト側の依存は `openpyxl` のみ（`requirements.txt` は無く、`docs/food-data.md` に `pip install openpyxl` と記載）。

---

## 5. テストの構成と181件の内訳

- ランナー: Vitest 2.x。設定は `vite.config.ts` の `test` ブロック（`environment: 'node'`、`include: ['src/test/**/*.test.ts']`）。
- テスト対象は **`src/lib/` の純関数のみ**。React コンポーネントのテストは1件も無い
  （`@testing-library/*` / `jsdom` / `happy-dom` は未導入）。
- 各テストファイルは `import { describe, it, expect } from 'vitest'` で明示的に取り込んでいる（グローバル注入に頼っていない）。
  `tsconfig.json` には `types: ["vitest/globals"]` の指定もある。
- 実行結果（このコミットで実測）: **Test Files 7 passed / Tests 181 passed / Duration 1.13s**。

| テストファイル | 件数 | describe ブロックごとの内訳 |
|---|---:|---|
| `src/test/foods.test.ts` | 48 | 食品データと成分表の一致 7 / 絵文字 4 / normalizeQuery 4 / searchFoods 14 / scaleFood 6 / カテゴリ 8 / findFood・foodCategories・isEstimated 5 |
| `src/test/nutrition.test.ts` | 30 | calcBMR 8 / calcMacros 12 / leanBodyMass・bmi 4 / weeksToGoal 3 / プリセット定義の健全性 3 |
| `src/test/plates.test.ts` | 25 | calcPlates 正常系 9 / calcPlates 境界値・異常系 8 / loadableWeights 2 / 単位換算 3 / プレート定義の健全性 3 |
| `src/test/rpe.test.ts` | 21 | rpePercent 正常系 4 / rpePercent 境界値・異常系 5 / oneRmFromRpe 4 / weightForRepsAtRpe 3 / buildRpeMatrix 5 |
| `src/test/onerm.test.ts` | 20 | estimateOneRM 正常系 7 / estimateOneRM 境界値・異常系 5 / repTableFromOneRM 5 / weightAtPercent・percentOfOneRM 3 |
| `src/test/smolov.test.ts` | 20 | buildSmolov 構造 4 / 重量計算 7 / テスト週 3 / 異常系 4 / smolovToText 2 |
| `src/test/format.test.ts` | 17 | isFiniteNumber 2 / parseNumber 4 / roundTo 5 / fmt・fmtComma 5 / clamp 1 |
| **合計** | **181** | describe ブロック計 36 |

検証の性格:

- 正常入力だけでなく、空入力・不正文字列・境界値・極端な大小・`NaN` / `Infinity` を各ツールで検証している。
- `foods.test.ts` の「食品データと成分表の一致」は、`src/lib/foodData.ts` の全300食品 × 6成分を
  `src/test/foods-source.json`（元Excel抽出値）と突き合わせる。`foodData.ts` を手で書き換えると
  どの食品のどの項目がずれたかを名指しで落とす仕組み。
- `foods-source.json` は `emit_ts.py` が `foodData.ts` とは別経路（生の `all_foods.json`）から書き出しており、
  検証の独立性を保っている。
- CI（`.github/workflows/deploy.yml`）は `npm ci` → `npm test` → `npm run build` の順で、テストが落ちるとデプロイされない。

---

## 6. 新プロジェクトへコピーを推奨するファイル

### A. そのままコピーできるもの（React非依存の純ロジック + データ + テスト）

新プロジェクトのフレームワークが React でなくても（Next.js / Svelte / Astro / Vue いずれでも）、
以下は TypeScript が動けばそのまま動く。`src/lib/` は `format.ts` を末端とする閉じた依存関係で、
外部パッケージへの依存がゼロ。

| パス | 行/サイズ | 備考 |
|---|---|---|
| `src/lib/format.ts` | 62行 | 全ロジックの土台。最初にコピーする |
| `src/lib/onerm.ts` | 122行 | `format.ts` のみ依存 |
| `src/lib/rpe.ts` | 86行 | `format.ts` のみ依存 |
| `src/lib/plates.ts` | 145行 | `format.ts` のみ依存。プレートの色定義（IPFカラー）も含む |
| `src/lib/smolov.ts` | 184行 | `format.ts` のみ依存 |
| `src/lib/nutrition.ts` | 191行 | `format.ts` のみ依存。`ACTIVITY_LEVELS` / `GOAL_PRESETS` の日本語ラベルを含む |
| `src/lib/foods.ts` | 274行 | `format.ts` + `foodData.ts` に依存。日本語検索（かな正規化・漢字読み・同義語）を含む |
| `src/lib/foodData.ts` | 313行 / 67KB | 食品300件。**`src/lib/foods.ts` の `Food` 型を `import type` しているので必ずセットで移す** |
| `src/test/format.test.ts` | 117行 | 以下テストはVitest前提（`import { describe, it, expect } from 'vitest'` を各ファイル先頭に持つ）。Jest等へ移すならこの1行を差し替える |
| `src/test/onerm.test.ts` | 146行 | |
| `src/test/rpe.test.ts` | 145行 | |
| `src/test/plates.test.ts` | 186行 | |
| `src/test/smolov.test.ts` | 145行 | |
| `src/test/nutrition.test.ts` | 188行 | |
| `src/test/foods.test.ts` | 341行 | `src/test/foods-source.json` を読むので同時に移す |
| `src/test/foods-source.json` | 2,702行 / 51KB | 食品データの検証用。これが無いと `foods.test.ts` が動かない |

### B. データを再生成する予定があるならコピーするもの

食品データを更新・入れ替えする気がないなら不要（A の `foodData.ts` があれば動く）。

| パス | 備考 |
|---|---|
| `scripts/food-data/extract.py` | Excelの列番号マッピングを持つ。成分表のフォーマットに依存 |
| `scripts/food-data/selection.py` | 300件の食品番号リスト。収録内容を変えるときここを編集 |
| `scripts/food-data/build.py` | 表示名・絵文字ルール。誤爆対策の蓄積が入っている |
| `scripts/food-data/emit_ts.py` | 出力先が `src/lib/foodData.ts` / `src/test/foods-source.json` にハードコードされている |
| `docs/food-data.md` | 出典・記号の扱い・再生成手順・絵文字の落とし穴。データの由来を説明する文書としても要る |

### C. React を継続する場合のみ意味があるもの

新プロジェクトのUI設計次第で捨ててよい。

| パス | 備考 |
|---|---|
| `src/lib/storage.ts` | `load`/`save` はReact非依存、`usePersistentState` のみ hooks 使用。localStorage不可環境のフォールバック付き |
| `src/components/Barbell.tsx` | プレート図のSVG。`lib/plates` からは型のみ依存。ロジックを持たない描画専用 |
| `src/components/ui.tsx` | 11個の共通UI部品。`styles.css` のクラス名と対で成立している |
| `src/tools/*.tsx`（6ファイル） | 各ツールの画面。バリデーション範囲とコピー用テキストの文言は再利用価値がある |
| `src/styles.css` | 1,250行。ライト/ダークのトークン定義と全パーツのスタイル。`ui.tsx`/`tools/*` のクラス名と密結合 |

### D. コピー不要 / 新規に作り直すもの

| パス | 理由 |
|---|---|
| `package.json` | 依存が React + Vite + Vitest だけ。新プロジェクトの構成に合わせて作る方が早い |
| `tsconfig.json` / `vite.config.ts` | 同上。ただし `vite.config.ts` の `base: './'` と Vitest の `include` 設定は参考になる |
| `index.html` | Vite固有のエントリ。meta/OGP/インラインSVG favicon の書き方だけ参考 |
| `src/main.tsx` / `src/App.tsx` | エントリとタブ切替。新サイトのルーティングに置き換わる |
| `.github/workflows/deploy.yml` | GitHub Pages 前提。デプロイ先が変わるなら作り直し |
| `.gitignore` / `.gitattributes` / `LICENSE` / `README.md` | プロジェクト固有。新規作成 |

### コピー手順の要点

1. `src/lib/format.ts` → 各ロジック → `foods.ts` + `foodData.ts` の順で入れると、途中で型エラーが出ない。
2. `foodData.ts` は `import type { Food } from './foods'` を持つので、`foods.ts` と同じディレクトリに置くか import パスを直す。
3. テストを移す場合、各ファイル先頭の `import { describe, it, expect } from 'vitest'` を移行先ランナーのものに差し替える。
4. `foods.test.ts` は `import source from './foods-source.json'` で同ディレクトリのJSONを読むので、配置を変えたらパスを直す。
   `tsconfig.json` の `resolveJsonModule: true` も必要。
