import { API_URL } from "@/lib/config";

/** Адрес картинки, загруженной на наш сервер (путь вида /media/...) */
export const mediaUrl = (p: string) => (p.startsWith("/media/") ? `${API_URL}${p}` : "");

/** Круглый аватар: картинка или золотой кружок с первой буквой ника */
export default function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  const u = src ? (src.startsWith("/media/") ? mediaUrl(src) : /^(data:image\/|https?:\/\/)/.test(src) ? src : "") : "";
  return u ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={u} alt={name} width={size} height={size} loading="lazy" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full shrink-0 flex items-center justify-center font-extrabold" style={{ width: size, height: size, fontSize: size * 0.45, background: "linear-gradient(135deg,#f5d36b,#c8962e)", color: "#2a1d00" }}>
      {(name[0] || "?").toUpperCase()}
    </div>
  );
}
