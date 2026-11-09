// Рассказывает о HiMeet Mail: плитка «Общение» на главной, страница /join/, llms.txt. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "web")) ? path.join("chess-bet", "web") : fs.existsSync("web") ? "web" : ".";
function patch(rel, pairs) {
  const f = path.join(root, rel);
  let t = fs.readFileSync(f, "utf8");
  if (t.includes("HiMeet Mail")) { console.log("уже есть:", rel); return; }
  for (const [a, b] of pairs) {
    const n = t.split(a).length - 1;
    if (n !== 1) throw new Error(`${rel}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 60)}`);
    t = t.replace(a, () => b);
  }
  fs.writeFileSync(f, t);
  console.log("готово:", rel);
}
patch("components/HomeTiles.tsx", [
  ['["Общение", "Бесплатные сообщения и звонки с переводом чата, лента Rook Club"]', '["Общение", "Бесплатные сообщения и звонки с переводом чата, почта HiMeet Mail, лента Rook Club"]'],
  ['["Chat", "Free messages and calls with chat translation, Rook Club feed"]', '["Chat", "Free messages and calls with chat translation, HiMeet Mail, Rook Club feed"]'],
]);
patch("app/join/page.tsx", [
  ['"Пишите и звоните из профиля любому участнику. В чате включается автоматический перевод, поэтому можно общаться на разных языках."', '"Пишите и звоните из профиля любому участнику. В чате включается автоматический перевод, поэтому можно общаться на разных языках. Есть и своя почта HiMeet Mail: адрес ник@himeet, входящие, отправленные и избранное."'],
  ['"Message and call any member from their profile. Chats have automatic translation, so you can talk across languages."', '"Message and call any member from their profile. Chats have automatic translation, so you can talk across languages. You also get HiMeet Mail: an address like name@himeet with inbox, sent and starred folders."'],
]);
patch("public/llms.txt", [
  ["- Free chess: play against a bot", "- HiMeet Mail: every member has an internal mail address (name@himeet). Letters with a subject and long text go between HiMeet members only, with inbox, sent, starred and trash folders. It is not connected to regular email.\n- Free chess: play against a bot"],
]);
