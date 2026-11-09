// SEO: главное название и описание про мессенджер, объявления, знакомства и шахматы; без акцента на деньги и ставки.
// Меняет app/layout.tsx, public/manifest.json, app/about/layout.tsx. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "web")) ? path.join("chess-bet", "web") : fs.existsSync("web") ? "web" : ".";
const P = (f) => path.join(root, f);
function swap(t, a, b, f) {
  const n = t.split(a).length - 1;
  if (n !== 1) throw new Error(`${f}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 60)}`);
  return t.replace(a, () => b);
}
const NEW_TITLE = "HiMeet: Free Messenger, Classifieds, Dating & Chess";
const NEW_DESC = "Free messenger with calls and chat translation, worldwide classifieds, 18+ dating, a social feed and online chess. Optional USDC stakes on Polygon for adults (18+), held by an open smart contract.";

{ // layout.tsx
  const f = "app/layout.tsx";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes(NEW_TITLE)) console.log("уже есть:", f);
  else {
    t = swap(t, 'const TITLE = "HiMeet: Social Network, Classifieds, Dating & Chess for USDC";', `const TITLE = "${NEW_TITLE}";`, f);
    t = swap(t, 'const DESC = "Social network with free worldwide classifieds and chat translation, 18+ dating and online chess for USDC stakes on Polygon. Winner gets 90% via smart contract.";', `const DESC = "${NEW_DESC}";`, f);
    t = swap(t, 'alternateName: "HiMeet: Social Network, Classifieds, Dating & Chess for USDC"', `alternateName: "${NEW_TITLE}"`, f);
    t = swap(t, 'alt: "HiMeet: social network, classifieds, dating and chess for USDC"', 'alt: "HiMeet: free messenger, classifieds, dating and chess"', f);
    const kw = '"play chess for money", "chess betting", "chess USDC", "crypto chess", "chess stakes", ';
    t = swap(t, kw, '"free messenger", "free video calls", "chat translator", ', f);
    t = swap(t, '"play to earn chess", "crypto chess game", "USDC chess game", ', "", f);
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}
{ // manifest.json
  const f = "public/manifest.json";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes(NEW_TITLE)) console.log("уже есть:", f);
  else {
    t = swap(t, '"name": "HiMeet: Social Network, Classifieds, Dating & Chess for USDC"', `"name": "${NEW_TITLE}"`, f);
    t = swap(t, '"description": "Social network with free worldwide classifieds and chat translation, 18+ dating and online chess for USDC stakes on Polygon."', '"description": "Free messenger with calls and chat translation, worldwide classifieds, 18+ dating and online chess."', f);
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}
{ // about/layout.tsx
  const f = "app/about/layout.tsx";
  let t = fs.readFileSync(P(f), "utf8");
  if (t.includes("About HiMeet: Messenger")) console.log("уже есть:", f);
  else {
    t = swap(t, 'const TITLE = "About HiMeet: Chess for USDC on Polygon & Rook Club";', 'const TITLE = "About HiMeet: Messenger, Classifieds, Dating & Chess";', f);
    fs.writeFileSync(P(f), t);
    console.log("готово:", f);
  }
}
