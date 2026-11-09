// Нижнее меню: 7 вкладок -> 5 (Главная, Партия, Бот, Кабинет, Заработай).
// «Мультяшные шахматы» и «Дорожная карта» переехали в блок «Ещё» на главной. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "web")) ? path.join("chess-bet", "web") : fs.existsSync("web") ? "web" : ".";
const P = (f) => path.join(root, f);
function swap(t, a, b, f) {
  const n = t.split(a).length - 1;
  if (n !== 1) throw new Error(`${f}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 50)}`);
  return t.replace(a, () => b);
}

{ // BottomNav
  const f = "components/BottomNav.tsx";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes("grid-cols-5")) console.log("уже есть:", f);
  else {
    t = swap(t, `  { id: "cartoon", key: "bot", icon: "🎭" },\n`, "", f);
    t = swap(t, `  { id: "roadmap", key: "lobby", icon: "🗺" },\n`, "", f);
    t = swap(t, `  { id: "profile", key: "profile", icon: "◉" },\n  { id: "earn", key: "lobby", icon: "💰" },\n`, `  { id: "earn", key: "lobby", icon: "💰" },\n  { id: "profile", key: "profile", icon: "◉" },\n`, f);
    t = swap(t, "grid-cols-7", "grid-cols-5", f);
    t = swap(t, `  const cartL = lang === "ru" ? "Мульт" : "Cartoon";\n  const roadL = lang === "ru" ? "Карта" : "Roadmap";\n`, "", f);
    t = swap(t, ` : x.id === "cartoon" ? cartL : x.id === "roadmap" ? roadL : t(x.key)}`, ` : t(x.key)}`, f);
    t = swap(t, `            {x.id === "cartoon" && cartBadge && <span className="absolute top-1 end-[30%] w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />}\n`, "", f);
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}

{ // page.tsx: кнопки в блоке «Ещё»
  const f = "app/page.tsx";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes('setTab("roadmap")} className="btn btn-ghost')) console.log("уже есть:", f);
  else {
    const a = "                <TelegramCard />\n";
    const b =
`                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setCartMode("bot"); setTab("cartoon"); }} className="btn btn-ghost">🎭 {ru ? "Мультяшные шахматы" : "Cartoon chess"}{cartActive ? " •" : ""}</button>
                  <button type="button" onClick={() => setTab("roadmap")} className="btn btn-ghost">🗺 {ru ? "Дорожная карта" : "Roadmap"}</button>
                </div>
`;
    t = swap(t, a, b + a, f);
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}
