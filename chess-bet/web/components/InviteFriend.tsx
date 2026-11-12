"use client";
import { useActiveAccount } from "thirdweb/react";
import { useApp } from "@/lib/ctx";
import { absoluteUrl } from "@/lib/urls";
import ShareMenu from "./ShareMenu";

/** HiMeet invite: карточка «Пригласить друга». Ссылка на сайт с вашим кодом; кнопка открывает меню отправки. */
export default function InviteFriend() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const account = useActiveAccount();
  const url = absoluteUrl("/") + (account ? "?ref=" + account.address.toLowerCase() : "");
  const text = ru
    ? "Привет! Я в HiMeet: общаемся на любых языках, чат сам переводит, звонки бесплатные. Заходи:"
    : "Hi! I am on HiMeet: we can talk in any language, the chat translates for us and calls are free. Join me:";
  return (
    <section className="card space-y-3 text-center" style={{ border: "2px solid #ff8fb1" }}>
      <h2 className="text-lg font-extrabold">💌 {ru ? "Пригласите друга" : "Invite a friend"}</h2>
      <p className="text-sm opacity-80">{ru ? "С другом общаться интереснее: отправьте ссылку, и вы сможете писать и звонить друг другу на своих языках." : "Talking is more fun with a friend: send the link and you can chat and call each other in your own languages."}</p>
      <ShareMenu url={url} text={text} label={ru ? "Пригласить друга" : "Invite a friend"} className="btn btn-primary w-full justify-center" />
    </section>
  );
}
