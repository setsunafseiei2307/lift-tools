# 筋トレ計算ツール集（lift-tools）

ジムでスマホから使う前提で作った、筋トレ用のツール6種。
インストール不要・ログイン不要・完全クライアントサイド（サーバーへ何も送らない）。

| ツール | やること |
|---|---|
| 1RM換算 | 挙上重量×回数から最大挙上重量を7つの式で推定し、レップ別の目安重量表を出す |
| RPE換算 | 「あと何回できたか」から1RMを逆算し、狙ったRPEでの重量を出す |
| プレート計算 | 目標重量に対してバーの片側へ載せるプレートを図で表示する |
| Smolov | Smolov Jr. / Smolov の4週プログラムを1RMから自動生成する |
| PFC・カロリー | BMR→TDEE→目標カロリー→PFCを計算し、週あたりの体重変化を出す |
| 食品検索 | 16カテゴリ300食品からカロリー・PFCを引き、指定グラム数に換算する |

## 技術

- React 18 + TypeScript + Vite
- 状態管理ライブラリなし（useState + localStorage）
- CSSはカスタムプロパティで設計、ライト/ダークテーマ対応
- 依存はReactのみ。ビルド成果物 約224KB（gzip 71KB。うち食品データが約50KB）
- テスト: Vitest（181件）

計算ロジックは `src/lib/` にUIから完全分離してあり、すべて純関数。
UIを触らずに計算式だけテストできる構成にしている。

```
src/
├─ lib/          計算ロジック（純関数・テスト対象）
│  ├─ onerm.ts       1RM推定（Epley / Brzycki / Lander / Lombardi / O'Conner / Mayhew / Wathen）
│  ├─ rpe.ts         RPE→%1RM換算表
│  ├─ plates.ts      プレート計算（貪欲法）
│  ├─ smolov.ts      Smolovプログラム生成
│  ├─ nutrition.ts   BMR / TDEE / PFC
│  ├─ foods.ts       食品の検索・分量換算
│  ├─ foodData.ts    食品データ300件（自動生成・成分表から転記）
│  ├─ format.ts      数値の丸め・整形
│  └─ storage.ts     localStorageラッパー
├─ tools/        各ツールの画面
├─ components/   共通UI・プレートの図
└─ test/         ユニットテスト

scripts/food-data/  食品データの再生成スクリプト（Python）
docs/food-data.md   食品データの出典・再生成手順
```

## 動かし方

```bash
npm install
npm run dev        # http://localhost:5173
```

## ビルドと公開

```bash
npm run build      # dist/ に出力
npm run preview    # ビルド結果をローカル確認
```

`vite.config.ts` で `base: './'` にしてあるので、`dist/` をそのまま
GitHub Pages / Netlify / Vercel / レンタルサーバーのサブディレクトリ、
どこに置いても動く。

GitHub Pagesで公開する場合は、リポジトリの Settings → Pages → Source を
**GitHub Actions** にすれば `.github/workflows/deploy.yml` が自動で公開する。

## テスト

```bash
npm test           # 1回実行
npm run test:watch # 変更を監視
```

テストは正常入力だけでなく、空入力・不正入力・境界値・極端に大きい値／小さい値・
NaN / Infinity まで含めて検証している。

```
✓ src/test/foods.test.ts      (48)
✓ src/test/nutrition.test.ts  (30)
✓ src/test/plates.test.ts     (25)
✓ src/test/rpe.test.ts        (21)
✓ src/test/onerm.test.ts      (20)
✓ src/test/smolov.test.ts     (20)
✓ src/test/format.test.ts     (17)
  Tests  181 passed
```

## 設計上の判断

- **1RMは7つの式を並べて平均も出す**
  式によって推定値が10%以上ズレることがあるため、1つの値だけ見せると誤解を生む。
  ばらつき（最小〜最大）も併記している。
- **12レップを超えたら計算しない**
  高レップ域は推定誤差が実用に耐えないため、あえて `null` を返して画面に出さない。
- **RPE換算表は2次元で持たない**
  「限界までの残り回数が同じなら同じ強度」という構造があるので、
  1本の数列として持ち `(reps-1)*2 + (10-rpe)*2` で引く。表のメンテが1箇所で済む。
- **プレート計算は貪欲法**
  100kg（片側40kg）は 20×2 ではなく 25+15 を返す。枚数が少ないほうが実際に楽なため。
- **PFCは脂質に下限を設ける**
  カロリーを削ると脂質が0に近づくが、ホルモン維持の観点から
  体重1kgあたり0.7gを下限として割り込ませない。
- **目標カロリーが基礎代謝を下回っても計算は止めない**
  計算はした上で警告を返す。入力を拒否するより、なぜ危ないかを見せるほうが有用。
- **食品のカロリーはPFCから計算し直さない**
  日本食品標準成分表（八訂）はエネルギーを組成成分ベースで算出しており、
  食物繊維は約2kcal/g、アルコールは7kcal/gと係数が違う。
  P×4+F×9+C×4 では収載値と一致せず、300食品中34件で25%以上ずれる。
  収載値をそのままグラム数に比例させている。詳細は `docs/food-data.md`。
- **食品の絵文字は該当が無ければ null にする**
  豆腐・こんにゃく・しょうゆなど61件は絵文字なしで表示する。
  「近いけれど別の食品」の絵文字（カリフラワーに🥦など）は当てない。

## 食品データの出典

食品検索の300食品は、文部科学省「日本食品標準成分表（八訂）増補2023年」
第2章（データ）本表（全2,538食品）から転記したものです。数値は可食部100gあたりで、
**推測値・補完値は含みません**。各食品は成分表の食品番号と収載名を保持しており、
アプリの食品詳細画面にも出典を表示します。

<https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html>

`src/test/foods-source.json` に元Excelからの抽出値をそのまま置き、
全300食品×6成分が一致することを `npm test` で検証しています。
選定基準・再生成手順は `docs/food-data.md` を参照してください。

## 免責

推定値を計算するツールであり、医学的・栄養学的な助言ではありません。
減量や増量の計画は体調を見ながら、必要に応じて専門家に相談してください。

## ライセンス

MIT
