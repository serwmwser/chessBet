// Подключает баллы TCH к серверу: начисление после каждого звонка и маршрут /api/tch/me.
// Требует server/src/tch.ts. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "server")) ? path.join("chess-bet", "server") : fs.existsSync("server") ? "server" : ".";
if (!fs.existsSync(path.join(root, "src", "tch.ts"))) throw new Error("Нет server/src/tch.ts: сначала добавьте файл tch.ts");
const f = path.join(root, "src", "index.ts");
let t = fs.readFileSync(f, "utf8");
if (t.includes("handleTch")) { console.log("уже есть:", f); process.exit(0); }
function swap(a, b) {
  const n = t.split(a).length - 1;
  if (n !== 1) throw new Error(`${f}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 60)}`);
  t = t.replace(a, () => b);
}
swap('import { callsWss, handleCalls } from "./calls.js";\n',
  'import { callsWss, handleCalls, setCallHook } from "./calls.js";\nimport { handleTch, tchOnCall } from "./tch.js";\n\n// после каждого разговора начисляем баллы TCH (правила и лимиты в tch.ts)\nsetCallHook((c) => { const r = tchOnCall(c); if (!r.ok && r.reason !== "short") console.log("tch: без начисления", c.id, r.reason); });\n');
const route = '  if (url.pathname.startsWith("/api/calls/")) { handleCalls(req, res, url, viewerOf(req)).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); return; }\n';
swap(route, route + '  if (url.pathname.startsWith("/api/tch/")) { handleTch(req, res, url, viewerOf(req)).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); return; }\n');
fs.writeFileSync(f, t);
console.log("готово:", f);
