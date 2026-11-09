// Смена названия «Chess Bet» -> «HiMeet» в видимых текстах сайта, SEO, llms и сообщениях бота.
// НЕ трогает: подписи кошелька (ChessBet login/session/profile/referral), ключи хранилища, контракты,
// карточку Product Hunt (там страница продукта со старым именем), название NFT-картинок. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const app = fs.existsSync(path.join("chess-bet", "web")) ? "chess-bet" : ".";
if (!fs.existsSync(path.join(app, "web", "app"))) { console.error("Запускайте из корня репозитория"); process.exit(1); }

const NEW = "HiMeet";
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "out", "contracts", "artifacts", "data"]);
const SKIP_FILES = new Set(["ProductHuntCard.tsx", "package-lock.json"]);
const EXT = /\.(ts|tsx|js|mjs|json|txt|xml|md|html)$/i;
let files = 0, hits = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!EXT.test(e.name) || SKIP_FILES.has(e.name)) continue;
    const t = fs.readFileSync(p, "utf8");
    const n = t.split("Chess Bet").length - 1;
    if (!n) continue;
    fs.writeFileSync(p, t.split("Chess Bet").join(NEW));
    files++; hits += n;
  }
}
walk(path.join(app, "web"));
walk(path.join(app, "server", "src"));

// Заголовки страниц «Дорожная карта» и «Условия»: слово ChessBet слитно
const spec = [
  ["web/app/roadmap/page.tsx", ["Дорожная карта ChessBet", "ChessBet roadmap"]],
  ["web/app/terms/page.tsx", ['"ChessBet: шахматные', '"ChessBet: chess games']],
];
for (const [f, anchors] of spec) {
  const p = path.join(app, f);
  let t = fs.readFileSync(p, "utf8");
  for (const a of anchors) { if (t.includes(a)) { t = t.replace(a, a.replace("ChessBet", NEW)); hits++; } }
  fs.writeFileSync(p, t);
}
console.log(`Готово: файлов ${files}, замен ${hits}. Новое название: ${NEW}`);
