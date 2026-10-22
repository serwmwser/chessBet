"use client";
import { ChangeEvent, useRef, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { postProfile, ProfileData } from "@/lib/api";
import { forgetProfile, resizeAvatar, sha256Hex } from "@/lib/profile";
import { useApp } from "@/lib/ctx";
import { dropToken, ensureToken } from "@/lib/session";
import { Key } from "@/lib/i18n";
import Avatar from "./Avatar";

const ERR: Record<string, Key> = { name_taken: "nameTaken", bad_name: "badName", bad_link: "badLink", bad_avatar: "badImage" };

/** Форма настроек профиля: аватар, логин, «о себе», ссылка. Сохранение подтверждается подписью кошелька (без газа). */
export default function ProfileEditor({ initial, onSaved, onClose }: { initial: ProfileData | null; onSaved: (p: ProfileData) => void; onClose: () => void }) {
  const { t, toast } = useApp();
  const account = useActiveAccount();
  const [f, setF] = useState<ProfileData>(initial ?? { name: "", bio: "", link: "", avatar: "" });
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const x = e.target.files?.[0];
    e.target.value = "";
    if (!x) return;
    try { const a = await resizeAvatar(x); setF((v) => ({ ...v, avatar: a })); }
    catch { toast(t("badImage"), "err"); }
  };

  const save = async () => {
    if (!account) { toast(`${t("saveFailed")}: wallet`, "err"); return; }
    setBusy(true);
    try {
      const body = { name: f.name.trim(), bio: f.bio.trim(), link: f.link.trim(), avatar: f.avatar };
      const ts = Date.now();
      const hash = await sha256Hex(JSON.stringify(body));
      const token = await ensureToken(account); // одна подпись на 24 часа
      const sign = () => account.signMessage({ message: `ChessBet profile\nAddress: ${account.address}\nHash: ${hash}\nTime: ${ts}` });
      let r = token
        ? await postProfile({ ...body, address: account.address, ts, token })
        : await postProfile({ ...body, address: account.address, ts, sig: await sign() });
      if (!r.ok && token && r.error === "bad_signature") {
        dropToken(account.address);
        r = await postProfile({ ...body, address: account.address, ts, sig: await sign() });
      }
      if (!r.ok) { toast(ERR[r.error ?? ""] ? t(ERR[r.error ?? ""]) : `${t("saveFailed")}: ${r.error ?? "?"}`, "err"); return; }
      forgetProfile(account.address);
      toast(t("saved"), "ok");
      onSaved(body);
    } catch (e) { toast(`${t("saveFailed")}: ${(e as Error)?.message?.slice(0, 60) || "sign"}`, "err"); }
    finally { setBusy(false); }
  };

  const inp = "w-full rounded-2xl bg-black/5 dark:bg-white/10 px-3 py-2.5 text-sm outline-none focus:ring-2 ring-emerald-500";
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">{t("profileSettings")}</h2>
      <div className="flex items-center gap-3">
        <Avatar src={f.avatar} name={f.name} size={72} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip chip-on" onClick={() => file.current?.click()}>{t("avatarChange")}</button>
          {f.avatar && <button type="button" className="chip" onClick={() => setF({ ...f, avatar: "" })}>{t("avatarRemove")}</button>}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
      </div>
      <label className="block space-y-1">
        <span className="text-xs opacity-60">{t("login")}</span>
        <input className={inp} dir="ltr" maxLength={20} autoCapitalize="none" autoCorrect="off" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <span className="text-[11px] opacity-50">{t("loginHint")}</span>
      </label>
      <label className="block space-y-1">
        <span className="text-xs opacity-60">{t("aboutMe")}</span>
        <textarea className={inp} rows={3} maxLength={160} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        <span className="text-[11px] opacity-50">{f.bio.length}/160</span>
      </label>
      <label className="block space-y-1">
        <span className="text-xs opacity-60">{t("linkLabel")}</span>
        <input className={inp} dir="ltr" inputMode="url" maxLength={200} placeholder="https://" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
      </label>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy} onClick={save}>{t("save")}</button>
        <button className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
      </div>
    </section>
  );
}
