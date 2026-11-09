// Подключает HiMeet Mail к серверу: маршруты /api/mail/* и уведомление в Telegram о новом письме.
// Требует server/src/mail.ts. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "server")) ? path.join("chess-bet", "server") : fs.existsSync("server") ? "server" : ".";
if (!fs.existsSync(path.join(root, "src", "mail.ts"))) throw new Error("Нет server/src/mail.ts: сначала добавьте файл mail.ts");
const f = path.join(root, "src", "index.ts");
let t = fs.readFileSync(f, "utf8");
if (t.includes("handleMail")) { console.log("уже есть:", f); process.exit(0); }
function swap(a, b) {
  const n = t.split(a).length - 1;
  if (n !== 1) throw new Error(`${f}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 60)}`);
  t = t.replace(a, () => b);
}
swap('import { handleDm, setDmNotify } from "./dm.js";\n', 'import { handleDm, setDmNotify } from "./dm.js";\nimport { handleMail, setMailNotify } from "./mail.js";\n');
const dmNotify = "setDmNotify((to, from) =>";
const i = t.indexOf(dmNotify);
if (i < 0 || t.indexOf(dmNotify, i + 1) >= 0) throw new Error("setDmNotify: якорь не найден или не один");
const lineEnd = t.indexOf("\n", i);
t = t.slice(0, lineEnd + 1) +
  'setMailNotify((to, from) => { void tgNotify(to, `📧 Новое письмо от @${from}`, `📧 New mail from @${from}`, `mail:${from}:${Math.floor(Date.now() / 600000)}`, `${SITE_URL}/u/?tab=mail`); });\n' +
  t.slice(lineEnd + 1);
const dmRoute = '  if (url.pathname.startsWith("/api/dm/")) { handleDm(req, res, url, viewerOf(req)).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); return; }\n';
swap(dmRoute, dmRoute + '  if (url.pathname.startsWith("/api/mail/")) { handleMail(req, res, url, viewerOf(req)).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); return; }\n');
fs.writeFileSync(f, t);
console.log("готово:", f);
