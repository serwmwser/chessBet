"use client";
import { useApp } from "@/lib/ctx";

type Sec = [string, string[]];

// ШАБЛОН. Перед запуском с реальными деньгами текст должен проверить юрист вашей страны.
const RU: Sec[] = [
  ["1. Кто может пользоваться", [
    "Сервис только для совершеннолетних (18+ или старше, если закон вашей страны требует большего возраста).",
    "Вы сами отвечаете за то, что игра на деньги и работа с криптовалютой разрешены в вашей стране. Сервис может быть недоступен в отдельных странах, и мы вправе ограничить доступ.",
  ]],
  ["2. Что это за сервис", [
    "ChessBet: шахматные партии, в которых игроки по желанию ставят USDC в сети Polygon. Ставки хранит смарт-контракт, а не мы. Результат партии определяет игровой сервер по правилам шахмат.",
    "Результат зависит от вашего мастерства, но выигрыш не гарантирован: вы можете проиграть всю ставку. Ставьте только то, что готовы потерять.",
  ]],
  ["3. Ставки и комиссия", [
    "Из банка партии с победителем удерживается комиссия 10%, победитель получает остальное. При ничьей, отмене или невозможности записать результат ставки возвращаются полностью.",
    "Выигрыш вы забираете сами кнопкой «Забрать выигрыш» (нужна транзакция и небольшой запас POL на комиссию сети). Максимальная ставка ограничена контрактом.",
    "Транзакции в блокчейне необратимы. Проверяйте суммы и адреса в кошельке до подтверждения.",
  ]],
  ["4. Игры без ставок", [
    "Партии с ботом и бесплатные партии с другом по ссылке не содержат денег и не записываются в блокчейн. Бесплатные партии хранятся на сервере недолго и могут быть удалены без предупреждения.",
  ]],
  ["5. NFT партий", [
    "Игроки партии со ставкой могут после её окончания за 1 USDC создать NFT выбранного хода. Плата поступает на баланс приложения. Картинка и данные NFT хранятся в блокчейне Polygon.",
    "Приложение получает 5% роялти с перепродаж, если площадка (например, OpenSea) их выплачивает. NFT не обещает прибыли, его цена не гарантирована, и никто не обязан его покупать. NFT не является ценной бумагой или инвестиционным предложением.",
    "Площадки перепродажи принадлежат третьим лицам, их правила и риски вы принимаете сами.",
  ]],
  ["6. Реферальная программа", [
    "Пригласивший получает долю комиссии с платных партий приглашённых друзей по уровням, указанным в разделе «Заработок». Друг засчитывается после первой платной партии.",
    "Доход не гарантирован. Условия, уровни и проценты могут меняться, о важных изменениях мы сообщим в приложении. Спам, обман и накрутка запрещены и ведут к отказу в выплатах. Налоги со своего дохода вы платите сами.",
  ]],
  ["7. Планы и токен", [
    "Дорожная карта описывает намерения, а не обещания сроков или дохода. Собственный токен может быть выпущен только при выполнении условий, указанных в дорожной карте, включая юридическую проверку. Описание планов не является предложением ценных бумаг или призывом что-либо покупать.",
  ]],
  ["8. Правила честной игры", [
    "Запрещены помощь движка и других людей во время партии, несколько аккаунтов, сговор с соперником и любые попытки обмануть сервис или контракт. За нарушения возможны блокировка и отказ в доступе к сервису; средства в контракте остаются по его правилам.",
  ]],
  ["9. Ответственная игра", [
    "Если игра перестала приносить удовольствие, остановитесь и обратитесь за помощью. Не играйте в состоянии опьянения и на заёмные деньги.",
  ]],
  ["10. Данные и конфиденциальность", [
    "Для входа используется ваш кошелёк. Мы не просим email и пароли и не имеем доступа к вашим ключам. Адрес кошелька и транзакции публичны в блокчейне.",
    "Сервер хранит записи партий, подписи входа, привязку к пригласившему и данные профиля, которые вы указали. На устройстве сохраняются настройки (язык, тема, выбранные пешки и голос) и секреты мест в бесплатных партиях. Для работы используются сторонние сервисы (кошельки, поставщики доступа к сети), у которых свои правила.",
  ]],
  ["11. Ограничение ответственности", [
    "Сервис предоставляется «как есть». Мы не отвечаем за сбои сети Polygon, кошельков и сторонних площадок, потерю ключей, решения игроков и убытки от ставок. Смарт-контракт может содержать ошибки, несмотря на проверки.",
  ]],
  ["12. Изменения и связь", [
    "Мы можем менять эти условия; продолжая пользоваться сервисом, вы принимаете новую редакцию. Контакт для обращений: [укажите адрес электронной почты].",
  ]],
];

const EN: Sec[] = [
  ["1. Who may use the service", [
    "The service is for adults only (18+, or older if the law of your country requires it).",
    "You are responsible for making sure that playing for money and using cryptocurrency are legal where you live. The service may be unavailable in some countries, and we may restrict access.",
  ]],
  ["2. What the service is", [
    "ChessBet: chess games in which players may stake USDC on the Polygon network. Stakes are held by a smart contract, not by us. The result is determined by the game server according to the rules of chess.",
    "The result depends on your skill, but winning is not guaranteed: you can lose your whole stake. Only stake what you can afford to lose.",
  ]],
  ["3. Stakes and fee", [
    "A 10% fee is taken from the pot of a game with a winner, and the winner receives the rest. On a draw, a cancellation or if the result cannot be recorded, stakes are refunded in full.",
    "You claim winnings yourself with the Claim button (it needs a transaction and a small reserve of POL for the network fee). The maximum stake is limited by the contract.",
    "Blockchain transactions are irreversible. Check amounts and addresses in your wallet before confirming.",
  ]],
  ["4. Games without stakes", [
    "Bot games and free games with a friend by link involve no money and are not recorded on the blockchain. Free games are kept on the server only briefly and may be deleted without notice.",
  ]],
  ["5. Game NFTs", [
    "After a game with a stake has ended, its players may create an NFT of a chosen move for 1 USDC. The fee goes to the app balance. The picture and data of the NFT are stored on the Polygon blockchain.",
    "The app receives a 5% royalty on resales if the marketplace (for example OpenSea) pays it. An NFT does not promise profit, its price is not guaranteed and nobody is obliged to buy it. An NFT is not a security or an investment offer.",
    "Resale marketplaces belong to third parties, and you accept their rules and risks yourself.",
  ]],
  ["6. Referral program", [
    "The inviter receives a share of the fee from paid games of invited friends according to the levels shown in the Earn section. A friend counts after their first paid game.",
    "Income is not guaranteed. Terms, levels and percentages may change, and we will announce important changes in the app. Spam, deception and fake activity are forbidden and lead to a refusal of payouts. You pay taxes on your own income.",
  ]],
  ["7. Plans and token", [
    "The roadmap describes intentions, not promises of dates or income. An own token may be issued only when the conditions stated in the roadmap are met, including a legal review. A description of plans is not an offer of securities or a call to buy anything.",
  ]],
  ["8. Fair play", [
    "Using an engine or other people during a game, multiple accounts, collusion with an opponent and any attempt to deceive the service or the contract are forbidden. Violations may lead to a ban and loss of access; funds in the contract stay under its rules.",
  ]],
  ["9. Responsible play", [
    "If playing stops being fun, stop and seek help. Do not play while intoxicated or with borrowed money.",
  ]],
  ["10. Data and privacy", [
    "You sign in with your wallet. We do not ask for email or passwords and have no access to your keys. Your wallet address and transactions are public on the blockchain.",
    "The server stores game records, sign-in signatures, the link to your inviter and the profile data you provided. Your device keeps settings (language, theme, chosen pawns and voice) and seat secrets of free games. Third-party services (wallets, network access providers) are used and have their own rules.",
  ]],
  ["11. Limitation of liability", [
    "The service is provided as is. We are not responsible for failures of the Polygon network, wallets and third-party platforms, lost keys, players' decisions and losses from stakes. A smart contract may contain errors despite checks.",
  ]],
  ["12. Changes and contact", [
    "We may change these terms; by continuing to use the service you accept the new version. Contact: [enter an email address].",
  ]],
];

export default function Terms() {
  const { lang } = useApp();
  const ru = lang === "ru";
  const secs = ru ? RU : EN;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-5">
      <a className="text-sm underline" href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/"}>← {ru ? "На главную" : "Home"}</a>
      <h1 className="text-2xl font-bold">{ru ? "Условия использования" : "Terms of use"}</h1>
      <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs">
        {ru
          ? "Это шаблон условий, а не юридическая консультация. Перед запуском с реальными деньгами его должен проверить юрист вашей страны."
          : "This is a template, not legal advice. A lawyer in your country must review it before launching with real money."}
      </p>
      {secs.map(([h, ps]) => (
        <section key={h} className="space-y-1.5">
          <h2 className="text-lg font-semibold">{h}</h2>
          {ps.map((p) => <p key={p} className="text-sm opacity-85">{p}</p>)}
        </section>
      ))}
      <p className="text-xs opacity-60">18+ · {ru ? "Ставки связаны с риском проигрыша. Играйте ответственно." : "Stakes carry the risk of losing. Play responsibly."}</p>
    </main>
  );
}
