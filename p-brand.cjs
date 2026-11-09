// Бренд HiMeet: рука-приветствие вместо коня в шапке, название видно на телефоне,
// светлая заставка при открытии, светлый фон при установке приложения. Можно запускать повторно.
// Картинки (иконки, заставка, превью) кладутся отдельно из himeet-images.zip.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "web")) ? path.join("chess-bet", "web") : fs.existsSync("web") ? "web" : ".";
function patch(rel, marker, pairs) {
  const f = path.join(root, rel);
  let t = fs.readFileSync(f, "utf8");
  if (t.includes(marker)) { console.log("уже есть:", rel); return; }
  for (const [a, b] of pairs) {
    const n = t.split(a).length - 1;
    if (n !== 1) throw new Error(`${rel}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 60)}`);
    t = t.replace(a, () => b);
  }
  fs.writeFileSync(f, t);
  console.log("готово:", rel);
}

patch("components/Header.tsx", "👋", [
  ['text-white text-xl">♞</span>', 'text-white text-xl">👋</span>'],
  ['<span className="hidden sm:block leading-tight">\n            <span className="block">HiMeet</span>\n            <span className="block text-[11px] font-medium opacity-70 max-w-[16rem]">{ru ? "Соцсеть, объявления, знакомства и шахматы на USDC" : "Social Network, Classifieds, Dating & Chess for USDC"}</span>',
   '<span className="leading-tight">\n            <span className="block">HiMeet</span>\n            <span className="hidden sm:block text-[11px] font-medium opacity-70 max-w-[16rem]">{ru ? "Общение, объявления, знакомства и шахматы" : "Chat, Classifieds, Dating & Chess"}</span>'],
  ['className="rounded-xl bg-black/5 dark:bg-white/10 px-2 py-2 text-sm outline-none max-w-[110px]"', 'className="rounded-xl bg-black/5 dark:bg-white/10 px-2 py-2 text-sm outline-none max-w-[72px] sm:max-w-[110px]"'],
  ["        <MusicToggle />\n", '        <span className="hidden min-[400px]:block"><MusicToggle /></span>\n'],
]);

patch("components/OpenSplash.tsx", "#f4f7ff", [
  ["background:#04101c;", "background:#f4f7ff;"],
  ["object-fit:cover;object-position:center bottom;", "object-fit:contain;object-position:center;"],
  ["background:rgba(255,255,255,.18);overflow:hidden}", "background:rgba(30,42,74,.12);overflow:hidden}"],
  ["background:#ffc400;", "background:#818cf8;"],
]);

patch("public/manifest.json", '"background_color": "#f4f7ff"', [
  ['"background_color": "#0e2233"', '"background_color": "#f4f7ff"'],
]);
