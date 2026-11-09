// Пинг IndexNow: сообщает Bing, Яндексу и другим поисковикам о новых и изменённых страницах из sitemap.xml.
// Запуск: node scripts/indexnow.mjs          — только страницы с lastmod за последние 2 дня
//         node scripts/indexnow.mjs --all    — все страницы
//         node scripts/indexnow.mjs --dry    — только показать, что будет отправлено
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "serwmwser.github.io";
const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, "..", "public");
const keyFile = fs.readdirSync(pub).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) { console.error("Нет файла ключа public/<32 hex>.txt"); process.exit(1); }
const key = keyFile.replace(".txt", "");
if (fs.readFileSync(path.join(pub, keyFile), "utf8").trim() !== key) { console.error("Содержимое файла ключа не совпадает с его именем"); process.exit(1); }

const xml = fs.readFileSync(path.join(pub, "sitemap.xml"), "utf8");
const all = args().includes("--all");
const dry = args().includes("--dry");
const since = Date.now() - 2 * 86400000;
const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
  .map((m) => ({ loc: /<loc>(.*?)<\/loc>/.exec(m[1])?.[1] || "", mod: Date.parse(/<lastmod>(.*?)<\/lastmod>/.exec(m[1])?.[1] || "") }))
  .filter((u) => u.loc.startsWith(`https://${HOST}/`) && (all || (u.mod || 0) >= since))
  .map((u) => u.loc);

function args() { return process.argv.slice(2); }

if (!urls.length) { console.log("Нет страниц для отправки (lastmod старше 2 дней). Используйте --all."); process.exit(0); }
const body = { host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls };
console.log(`IndexNow: ${urls.length} стр.`); urls.forEach((u) => console.log(" -", u));
if (dry) { console.log("(пробный запуск, ничего не отправлено)"); process.exit(0); }

const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
console.log("Ответ:", r.status, r.statusText);
// 200 и 202 — принято (202: ключ проверяется), 422/403 — проблема с ключом или адресами
process.exit(r.status === 200 || r.status === 202 ? 0 : 1);
