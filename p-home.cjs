// Главная: плитки разделов сверху; шахматы, ставки в USDC и «Ещё» убраны в сворачиваемые блоки.
// Меню «Играть» ведёт на #games (откроет блок шахмат). Требует предварительно p-nav6.cjs и HomeTiles.tsx. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "web")) ? path.join("chess-bet", "web") : fs.existsSync("web") ? "web" : ".";
const P = (f) => path.join(root, f);

if (!fs.existsSync(P("components/HomeTiles.tsx"))) throw new Error("Нет components/HomeTiles.tsx: сначала добавьте файл HomeTiles.tsx");

function once(text, anchor, file) {
  const n = text.split(anchor).length - 1;
  if (n !== 1) throw new Error(`${file}: якорь найден ${n} раз(а), нужен ровно 1: ${anchor.slice(0, 60)}`);
}

// ---------- app/page.tsx
{
  const f = "app/page.tsx";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes("HomeTiles")) console.log("уже есть:", f);
  else {
    // импорт
    const imp = 'import Hero from "@/components/Hero";\n';
    once(t, imp, f);
    t = t.replace(imp, imp + 'import HomeTiles from "@/components/HomeTiles";\n');

    // состояния и обработчики
    const st = 'const [tab, setTab] = useState<Tab>("lobby");\n';
    once(t, st, f);
    const hooks =
`  const [gamesOpen, setGamesOpen] = useState(false); // блок «Играть в шахматы»
  const [betsOpen, setBetsOpen] = useState(false); // блок «Ставки в USDC»
  const [moreOpen, setMoreOpen] = useState(false); // блок «Ещё»
  const openGames = () => {
    setGamesOpen(true);
    setTimeout(() => document.getElementById("games")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  useEffect(() => {
    const h = () => { if (location.hash === "#games") openGames(); };
    h();
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
`;
    t = t.replace(st, st + hooks);

    // содержимое вкладки «lobby»
    const start = t.indexOf('{tab === "lobby" && <div className="space-y-4"><Hero');
    if (start < 0) throw new Error(f + ": не найден блок lobby");
    const end = t.indexOf("\n", start);
    const oldLine = t.slice(start, end);
    if (!oldLine.endsWith("<SiteFooter /></div>}")) throw new Error(f + ": блок lobby изменён, остановка");
    const NEW = `{tab === "lobby" && (
          <div className="space-y-4">
            <HomeTiles onEarn={() => setTab("earn")} onPlay={openGames} />

            <details id="games" open={gamesOpen} onToggle={(e) => setGamesOpen((e.currentTarget as HTMLDetailsElement).open)} className="card">
              <summary className="cursor-pointer select-none text-lg font-extrabold" style={{ color: "#d4a017" }}>♞ {ru ? "Играть в шахматы" : "Play chess"}</summary>
              <div className="space-y-4 pt-4">
                <Hero onBot={() => setTab("bot")} onEarn={() => setTab("earn")} />
                <FriendCard onStart={(c, mins) => { setFriend((f) => ({ room: null, color: c, minutes: mins, n: (f?.n ?? 0) + 1 })); setTab("friend"); }} />
                <MyFriendRooms onOpen={openRoom} />
                <details open={betsOpen} onToggle={(e) => setBetsOpen((e.currentTarget as HTMLDetailsElement).open)} className="rounded-2xl border border-black/10 dark:border-white/10 p-3">
                  <summary className="cursor-pointer select-none font-bold">💰 {ru ? "Ставки в USDC (только 18+)" : "USDC stakes (18+ only)"}</summary>
                  <p className="text-xs opacity-70 pt-2">{ru ? "Результат зависит от вашего мастерства, но выигрыш не гарантирован. Играйте только теми суммами, потерю которых можете себе позволить." : "The result depends on your skill, but winning is not guaranteed. Only play with amounts you can afford to lose."}</p>
                  <div className="pt-3"><Lobby /></div>
                </details>
                <LobbyLinks onArena={() => { setCartMode("arena"); setTab("cartoon"); }} />
              </div>
            </details>

            <details open={moreOpen} onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)} className="card">
              <summary className="cursor-pointer select-none text-lg font-extrabold" style={{ color: "#d4a017" }}>✨ {ru ? "Ещё" : "More"}</summary>
              <div className="space-y-4 pt-4">
                <AdsPromo />
                <AppDownload />
                <RefBanner onEarn={() => setTab("earn")} />
                <button type="button" onClick={() => setTab("nft")} className="w-full rounded-2xl px-4 py-3 text-start shadow-glow" style={{ background: "linear-gradient(90deg,#ff5a1f,#ff4fa3,#8b4dff)", color: "#fff" }}><div className="text-base font-extrabold">🎨 {ru ? "Студия NFT" : "NFT Studio"}</div><div className="text-xs font-medium opacity-90">{ru ? "Выберите ход из своей партии и мультяшную фигуру: получится картинка-NFT" : "Pick a move from your game and a cartoon piece to make an NFT picture"}</div></button>
                <TelegramCard />
              </div>
            </details>

            <SeoAbout />
            <SiteFooter />
          </div>
        )}`;
    t = t.slice(0, start) + NEW + t.slice(end);
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}

// ---------- SiteNav: «Играть» ведёт на #games, подсветка игнорирует #
{
  const f = "components/SiteNav.tsx";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes("#games")) console.log("уже есть:", f);
  else {
    const play = '{ href: ROUTES.home, ru: "Играть", en: "Play", icon: "♞", also:';
    const on = "const on = [it.href, ...(it.also ?? [])].some((h) => (norm(h) === norm(ROUTES.home) ? path === norm(h) : path.startsWith(norm(h))));";
    if (!t.includes(play) || !t.includes(on)) throw new Error(f + ": сначала примените p-nav6.cjs");
    t = t.replace(play, '{ href: ROUTES.home + "#games", ru: "Играть", en: "Play", icon: "♞", also:');
    t = t.replace(on, "const on = [it.href, ...(it.also ?? [])].map((h) => norm(h.split(\"#\")[0])).some((h) => (h === norm(ROUTES.home) ? path === h : path.startsWith(h)));");
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}
