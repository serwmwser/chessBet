// Профиль: вкладка «📧 Почта» (только в своём профиле) со счётчиком непрочитанных писем.
// Открывается и по ссылке /u/?tab=mail. Требует lib/mail.ts и components/MailPanel.tsx. Можно запускать повторно.
const fs = require("fs");
const path = require("path");
const root = fs.existsSync(path.join("chess-bet", "web")) ? path.join("chess-bet", "web") : fs.existsSync("web") ? "web" : ".";
for (const f of ["lib/mail.ts", "components/MailPanel.tsx"]) if (!fs.existsSync(path.join(root, f))) throw new Error("Нет файла " + f + ": сначала добавьте его");
const file = path.join(root, "app/u/page.tsx");
let t = fs.readFileSync(file, "utf8");
if (t.includes("MailPanel")) { console.log("уже есть:", file); process.exit(0); }
function swap(a, b) {
  const n = t.split(a).length - 1;
  if (n !== 1) throw new Error(`${file}: якорь найден ${n} раз(а), нужен 1: ${a.slice(0, 70)}`);
  t = t.replace(a, () => b);
}
swap('import ChatPanel from "@/components/ChatPanel";\n', 'import ChatPanel from "@/components/ChatPanel";\nimport MailPanel from "@/components/MailPanel";\n');
swap('import { useUnread } from "@/lib/dm";\n', 'import { useUnread } from "@/lib/dm";\nimport { useMailUnread } from "@/lib/mail";\n');
swap('type Tab = "posts" | "media" | "feed" | "chat";', 'type Tab = "posts" | "media" | "feed" | "chat" | "mail";');
swap("  const unread = useUnread(s.token);\n", "  const unread = useUnread(s.token);\n  const mailUnread = useMailUnread(s.token);\n");
swap('useState<Tab>(sp.get("tab") === "chat" ? "chat" : "posts")', 'useState<Tab>(sp.get("tab") === "chat" ? "chat" : sp.get("tab") === "mail" ? "mail" : "posts")');
swap('if (target && tab !== "chat" && (tab !== "feed" || s.token)) load(true);', 'if (target && tab !== "chat" && tab !== "mail" && (tab !== "feed" || s.token)) load(true);');
swap('["chat", ru ? "💬 Чат" : "💬 Chat"]];', '["chat", ru ? "💬 Чат" : "💬 Chat"], ...(u.me ? ([["mail", ru ? "📧 Почта" : "📧 Mail"]] as [Tab, string][]) : [])];');
swap('{k === "chat" && u.me && unread > 0 ? ` (${unread > 99 ? "99+" : unread})` : ""}', '{k === "chat" && u.me && unread > 0 ? ` (${unread > 99 ? "99+" : unread})` : ""}{k === "mail" && mailUnread > 0 ? ` (${mailUnread > 99 ? "99+" : mailUnread})` : ""}');
swap('{tab === "chat" ? (\n        <ChatPanel', '{tab === "mail" && u.me ? (\n        <MailPanel token={s.token} myName={s.me?.name} initialTo={sp.get("to") || ""} />\n      ) : tab === "chat" ? (\n        <ChatPanel');
fs.writeFileSync(file, t);
console.log("готово:", file);
