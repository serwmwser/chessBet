"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { listMyRooms, MyRoom, removeMyRoom } from "@/lib/room";

/** Мои бесплатные партии с друзьями: хранятся в этом браузере, пока комната жива на сервере (до 6 часов без ходов). */
export default function MyFriendRooms({ onOpen }: { onOpen: (id: string) => void }) {
  const { lang } = useApp();
  const ru = lang === "ru";
  const [list, setList] = useState<MyRoom[]>([]);
  useEffect(() => {
    const load = () => setList(listMyRooms());
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);
  if (list.length === 0) return null;
  const ago = (at: number) => {
    const m = Math.max(0, Math.round((Date.now() - at) / 60000));
    if (m < 1) return ru ? "только что" : "just now";
    if (m < 60) return ru ? `${m} мин назад` : `${m} min ago`;
    return ru ? `${Math.floor(m / 60)} ч назад` : `${Math.floor(m / 60)} h ago`;
  };
  return (
    <section className="card space-y-2">
      <h2 className="text-lg font-bold">🤝 {ru ? "Мои бесплатные партии" : "My free games"}</h2>
      {list.map((r) => (
        <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-2">
          <div className="me-auto min-w-0 text-sm">
            <div className="font-semibold">{ru ? "Партия с другом" : "Game with a friend"} · {r.color === "w" ? (ru ? "белые" : "White") : (ru ? "чёрные" : "Black")}</div>
            <div className="text-xs opacity-60">{ago(r.at)} · #{r.id.slice(0, 6)}</div>
          </div>
          <button type="button" className="btn btn-primary text-sm px-3 py-1.5" onClick={() => onOpen(r.id)}>{ru ? "Продолжить" : "Continue"}</button>
          <button type="button" aria-label={ru ? "Убрать из списка" : "Remove"} className="text-sm opacity-60 px-2" onClick={() => { removeMyRoom(r.id); setList(listMyRooms()); }}>✕</button>
        </div>
      ))}
      <p className="text-[11px] opacity-60">{ru ? "Партия хранится на сервере до 6 часов без ходов. Список хранится в этом браузере." : "A game is kept on the server for up to 6 hours without moves. The list is stored in this browser."}</p>
    </section>
  );
}
