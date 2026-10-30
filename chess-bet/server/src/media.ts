// Фото для постов и профилей: приём картинки (jpg/png/webp до 2 МБ), хранение на диске сервера, раздача по /media/<имя>.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type http from "node:http";

const DIR = process.env.MEDIA_DIR || "./data/media";
fs.mkdirSync(DIR, { recursive: true });
const MAX = 2 * 1024 * 1024;
const NAME_RE = /^[a-f0-9]{20}\.(jpg|png|webp)$/;
const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Тип по первым байтам файла (расширению и заголовку от клиента не верим) */
function kind(b: Buffer): "jpg" | "png" | "webp" | "" {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "";
}

const hits = new Map<string, number[]>();
function limited(key: string, max: number, ms: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 20000) hits.clear();
  return false;
}

function readRaw(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (Number(req.headers["content-length"] || 0) > MAX) { reject(new Error("too_big")); return; }
    let n = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { n += c.length; if (n > MAX) { reject(new Error("too_big")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Маршруты: POST /api/upload (нужен вход, тело = сама картинка) и GET /media/<имя>. viewer = кошелёк из токена или "" */
export async function handleMedia(req: http.IncomingMessage, res: http.ServerResponse, url: URL, viewer: string): Promise<void> {
  const json = (code: number, o: unknown) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); };

  if (req.method === "GET" && url.pathname.startsWith("/media/")) {
    const name = url.pathname.slice(7);
    if (!NAME_RE.test(name)) return json(404, { ok: false, error: "not_found" });
    const file = path.join(DIR, name);
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return json(404, { ok: false, error: "not_found" });
      res.writeHead(200, {
        "Content-Type": MIME[name.split(".")[1]], "Content-Length": st.size,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "cross-origin",
      });
      fs.createReadStream(file).pipe(res);
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/upload") {
    if (!viewer) return json(401, { ok: false, error: "auth" });
    if (limited("up:" + viewer, 20, 3600000) || limited("upday:" + viewer, 60, 86400000)) return json(429, { ok: false, error: "slow_down" });
    let buf: Buffer;
    try { buf = await readRaw(req); } catch { return json(413, { ok: false, error: "too_big" }); }
    const ext = kind(buf);
    if (!ext) return json(400, { ok: false, error: "bad_image" });
    const name = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 20) + "." + ext;
    const file = path.join(DIR, name);
    if (!fs.existsSync(file)) { fs.writeFileSync(file + ".tmp", buf); fs.renameSync(file + ".tmp", file); }
    return json(200, { ok: true, path: "/media/" + name });
  }

  json(404, { ok: false, error: "not_found" });
}
