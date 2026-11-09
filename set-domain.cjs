// Переезд сайта на новый домен: одной командой меняет домен во всех файлах сайта, сервера и сборки.
// Запуск из корня репозитория:  node set-domain.cjs новый-домен.com [адрес-API]
// Пример:  node set-domain.cjs rookclub.com            (API будет api.rookclub.com)
// Контракты (contracts/) не трогаются: уже опубликованный код менять нельзя.
const fs = require("fs");
const path = require("path");

const arg = (process.argv[2] || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(arg)) { console.error("Укажите домен, например: node set-domain.cjs rookclub.com"); process.exit(1); }
const NEW = arg;
const NEW_API = (process.argv[3] || "api." + NEW).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

const app = fs.existsSync(path.join("chess-bet", "web")) ? "chess-bet" : ".";
const urlsFile = path.join(app, "web/lib/urls.ts");
if (!fs.existsSync(urlsFile)) { console.error("Запускайте из корня репозитория (где папка chess-bet и .github)"); process.exit(1); }
const m = fs.readFileSync(urlsFile, "utf8").match(/SITE_URL\s*=\s*"https:\/\/([^"/]+)"/);
if (!m) { console.error("Не найден SITE_URL в lib/urls.ts"); process.exit(1); }
const OLD = m[1];
if (OLD === NEW) { console.log("Домен уже " + NEW + ", делать нечего."); process.exit(0); }
console.log(`Меняю ${OLD} -> ${NEW} (API: ${NEW_API})`);

const SKIP = new Set(["node_modules", ".git", ".next", "out", "contracts", "artifacts", "data"]);
const EXT = /\.(ts|tsx|js|mjs|cjs|json|txt|xml|md|yml|yaml|html|sh)$/i;
const oldApi = "api." + OLD;
let files = 0, hits = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!EXT.test(e.name) || e.name === "package-lock.json" || e.name === "set-domain.cjs") continue;
    const t = fs.readFileSync(p, "utf8");
    if (!t.includes(OLD)) continue;
    let n = t.split(oldApi).join(NEW_API).split(OLD).join(NEW);
    fs.writeFileSync(p, n);
    files++; hits += t.split(OLD).length - 1;
    console.log("  изменён:", p);
  }
}
walk(app);
const wf = path.join(".github", "workflows");
if (fs.existsSync(wf)) walk(wf);
console.log(`Готово: файлов ${files}, замен ${hits}.`);
console.log(`
Что ещё сделать вручную:
1) GitHub: Settings -> Pages -> Custom domain: ${NEW}; включить Enforce HTTPS.
2) DNS нового домена: A-записи @ на 185.199.108.153, .109.153, .110.153, .111.153; CNAME www на serwmwser.github.io;
   A-запись ${NEW_API} на 84.200.80.66.
3) Сервер (VPS): в Caddyfile заменить api.${OLD} на ${NEW_API}; в .env указать
   ALLOWED_ORIGINS=https://${NEW},https://www.${NEW}  и  SITE_URL=https://${NEW}; затем systemctl restart chessbet и перезагрузка Caddy.
4) Старый домен: не ставьте на него редирект и не размещайте его ссылки на новом сайте.
`);
