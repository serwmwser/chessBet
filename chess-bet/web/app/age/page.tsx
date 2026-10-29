"use client";
import { useApp } from "@/lib/ctx";

type Sec = { h: string; ps?: string[]; list?: string[] };

const RU: Sec[] = [
  { h: "Только 18+", ps: ["Chess Bet предназначен только для совершеннолетних: 18 лет или старше, а если закон вашей страны требует более высокого возраста, то с этого возраста. Это обязательное требование для игр со ставками."] },
  { h: "Зачем это нужно", list: ["В играх со ставками деньги переходят от игрока к игроку.", "За транзакции с криптовалютой вы отвечаете сами.", "Мы соблюдаем правила и защищаем несовершеннолетних от игр на деньги."] },
  { h: "Что вы подтверждаете", ps: ["Прежде чем играть со ставками, вы отмечаете галочку «Мне есть 18 лет». Этим вы подтверждаете, что:"], list: ["вам не менее 18 лет (или возраст совершеннолетия в вашей стране, если он выше);", "вы вправе заключать обязательные соглашения;", "игра на деньги и работа с криптовалютой разрешены в вашей стране;", "вы играете на свои деньги и понимаете риск проигрыша."] },
  { h: "Как мы относимся к возрасту", ps: ["Мы не собираем паспорта и документы: ставки хранит смарт-контракт, а у приложения нет личных кабинетов с данными документов. Поэтому ответственность за указание возраста лежит на вас.", "Если мы узнаем, что игрок младше допустимого возраста, мы вправе ограничить ему доступ к приложению. Сыгранные партии, уже записанные в блокчейн, мы изменить не можем. Выигрыш и возврат ставки определяются смарт-контрактом."] },
  { h: "Родителям", ps: ["Если вы родитель, то объясните ребёнку, что игры на деньги не для детей, и не оставляйте ему доступ к своему кошельку. Для обычных шахмат без денег есть бесплатный режим: игра с ботом и с другом без ставок."] },
  { h: "Играйте ответственно", list: ["Играйте только на те деньги, которые готовы потерять.", "Результат зависит от вашего мастерства, но выигрыш не гарантирован.", "Не пытайтесь отыграться любой ценой и делайте перерывы.", "Если игра перестала быть развлечением, остановитесь и поговорите с близкими или специалистом."] },
];

const EN: Sec[] = [
  { h: "18+ only", ps: ["Chess Bet is for adults only: 18 or older, or the age of majority in your country if it is higher. This is mandatory for games with stakes."] },
  { h: "Why 18+", list: ["In staked games, money moves from one player to another.", "You are responsible for your own crypto transactions.", "We follow the rules and keep minors away from games for money."] },
  { h: "What you confirm", ps: ["Before you play for stakes you tick the box “I am 18 or older”. By doing so you confirm that:"], list: ["you are at least 18 (or the age of majority where you live, if higher);", "you are legally able to enter binding agreements;", "playing for money and using cryptocurrency is allowed where you live;", "you play with your own money and understand the risk of losing."] },
  { h: "How we handle age", ps: ["We do not collect passports or ID documents. Stakes are held by a smart contract and the app has no accounts with identity documents. So the responsibility for stating your age is yours.", "If we learn that a player is under the allowed age, we may restrict their access to the app. We cannot change games already recorded on the blockchain. Winnings and refunds are decided by the smart contract."] },
  { h: "For parents", ps: ["If you are a parent, please explain to your child that games for money are not for children, and do not give them access to your wallet. For plain chess without money there is a free mode: play against a bot or a friend with no stakes."] },
  { h: "Play responsibly", list: ["Only play with money you are ready to lose.", "Your result depends on your skill, but winning is not guaranteed.", "Do not chase losses and take breaks.", "If playing stops being fun, stop and talk to someone you trust or to a professional."] },
];

export default function AgePage() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const secs = ru ? RU : EN;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-5">
      <a className="text-sm underline" href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/"}>← {ru ? "На главную" : "Home"}</a>
      <h1 className="text-2xl font-bold" style={{ color: "#d4a017" }}>{ru ? "Возраст 18+ и ответственная игра" : "Age 18+ and responsible play"}</h1>
      {secs.map((s) => (
        <section key={s.h} className="card space-y-2" style={{ border: "1px solid rgba(212,160,23,.5)" }}>
          <h2 className="text-lg font-semibold">{s.h}</h2>
          {s.ps?.map((p) => <p key={p} className="text-sm opacity-85">{p}</p>)}
          {s.list && <ul className="list-disc ps-5 space-y-1 text-sm opacity-85">{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
        </section>
      ))}
      <p className="text-xs opacity-60">18+ · <a className="underline" href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/terms/"}>{ru ? "Условия использования" : "Terms of use"}</a></p>
    </main>
  );
}
