#!/usr/bin/env node
// 楽天市場商品検索API(IchibaItem/Search)を呼び出し、商品候補をJSONで出力する。
// 外部パッケージに依存せず、Node.js標準機能(fs, fetch)のみを使用する。
//
// 使い方:
//   node scripts/search-item.mjs "ロードバイク エントリーモデル" [件数(既定5)]

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function loadEnv(envPath) {
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = { ...loadEnv(path.join(projectRoot, ".env")), ...process.env };

const applicationId = env.RAKUTEN_APPLICATION_ID;
const affiliateId = env.RAKUTEN_AFFILIATE_ID;

if (!applicationId) {
  console.error("エラー: RAKUTEN_APPLICATION_ID が .env に設定されていません。");
  process.exit(1);
}

const keyword = process.argv[2];
const hits = Number(process.argv[3] ?? 5);

if (!keyword) {
  console.error('使い方: node scripts/search-item.mjs "検索キーワード" [件数]');
  process.exit(1);
}

const endpoint = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601";
const params = new URLSearchParams({
  applicationId,
  keyword,
  hits: String(hits),
  format: "json",
  sort: "-reviewCount",
});
if (affiliateId) params.set("affiliateId", affiliateId);

const res = await fetch(`${endpoint}?${params.toString()}`);
const data = await res.json();

if (data.error) {
  console.error(`楽天APIエラー: ${data.error} - ${data.error_description ?? ""}`);
  process.exit(1);
}

const items = (data.Items ?? []).map(({ Item }) => ({
  name: Item.itemName,
  price: Item.itemPrice,
  shop: Item.shopName,
  reviewCount: Item.reviewCount,
  reviewAverage: Item.reviewAverage,
  itemUrl: Item.itemUrl,
  affiliateUrl: Item.affiliateUrl ?? null,
  imageUrl: Item.mediumImageUrls?.[0]?.imageUrl ?? Item.smallImageUrls?.[0]?.imageUrl ?? null,
  itemCaption: Item.itemCaption,
}));

console.log(JSON.stringify(items, null, 2));
