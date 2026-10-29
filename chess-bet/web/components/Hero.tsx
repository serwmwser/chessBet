"use client";
import { animate, AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { chain, client } from "@/lib/config";
import { useApp } from "@/lib/ctx";
import type { Lang } from "@/lib/i18n";
import { wallets } from "./Header";
import { TrustBlock } from "./PausePage";

type T = { net: string; h1: string; sub: string; cta: string; ctaBot: string; sl: string[]; lb: string[]; how: string; st: string[]; tr: string[]; resp: string };

const D: Record<Lang, T> = {
  ru: {
    net: "Сеть Polygon · USDC · минимальные комиссии", h1: "Шахматы на USDC", sub: "Сыграйте с соперником со всего мира. Победитель получает 90% банка прямо на свой кошелёк.",
    cta: "Играть на USDC", ctaBot: "Тренировка с ботом — бесплатно",
    sl: ["Твой ум — твой главный актив.", "Каждый ход — решение. Каждая победа — награда.", "Думай на три хода вперёд, выигрывай в USDC.", "Докажи, кто сильнее за доской.", "Мастерство решает всё. Играй и побеждай."],
    lb: ["победителю из банка", "USDC — ставка", "режимов времени", "комиссии при ничьей"], how: "Как начать",
    st: ["Войдите или подключите кошелёк", "Создайте игру или примите вызов", "Победите и заберите выигрыш"],
    tr: ["Ставки хранит смарт-контракт, а не мы", "Ничья и отмена: полный возврат ставки", "Выигрыш вы забираете сами кнопкой «Забрать»", "Комиссия 10% — плата за приложение без рекламы"],
    resp: "18+. Результат зависит от вашего мастерства, но выигрыш не гарантирован. Играйте ответственно.",
  },
  en: {
    net: "Polygon network · USDC · minimal fees", h1: "Chess for USDC", sub: "Play opponents from all over the world. The winner gets 90% of the pot straight to their wallet.",
    cta: "Play for USDC", ctaBot: "Practice with the bot — free",
    sl: ["Your mind is your greatest asset.", "Every move is a decision. Every win is a reward.", "Think three moves ahead, win in USDC.", "Prove who is stronger at the board.", "Skill decides everything. Play and win."],
    lb: ["of the pot to the winner", "USDC stake range", "time controls", "fee on a draw"], how: "How to start",
    st: ["Sign in or connect a wallet", "Create a game or accept a challenge", "Win and claim your prize"],
    tr: ["Stakes are held by a smart contract, not by us", "Draw or cancel: full refund of your stake", "You claim your winnings yourself with one button", "The 10% fee keeps the app free of ads"],
    resp: "18+. The result depends on your skill, but winning is not guaranteed. Play responsibly.",
  },
  es: {
    net: "Red Polygon · USDC · comisiones mínimas", h1: "Ajedrez por USDC", sub: "Juega contra rivales de todo el mundo. El ganador recibe el 90% del bote directo en su monedero.",
    cta: "Jugar por USDC", ctaBot: "Practica con el bot, gratis",
    sl: ["Tu mente es tu mejor activo.", "Cada jugada es una decisión. Cada victoria, un premio.", "Piensa tres jugadas por delante y gana en USDC.", "Demuestra quién es más fuerte en el tablero.", "La habilidad lo decide todo. Juega y gana."],
    lb: ["del bote al ganador", "USDC de apuesta", "modos de tiempo", "de comisión en tablas"], how: "Cómo empezar",
    st: ["Inicia sesión o conecta un monedero", "Crea una partida o acepta un reto", "Gana y reclama tu premio"],
    tr: ["Las apuestas las guarda un contrato inteligente, no nosotros", "Tablas o cancelación: devolución total", "Tú reclamas tus ganancias con un botón", "La comisión del 10% mantiene la app sin anuncios"],
    resp: "+18. El resultado depende de tu habilidad, pero ganar no está garantizado. Juega con responsabilidad.",
  },
  de: {
    net: "Polygon-Netzwerk · USDC · minimale Gebühren", h1: "Schach um USDC", sub: "Spiele gegen Gegner aus der ganzen Welt. Der Gewinner erhält 90 % des Pots direkt auf sein Wallet.",
    cta: "Um USDC spielen", ctaBot: "Training gegen den Bot, kostenlos",
    sl: ["Dein Verstand ist dein größtes Kapital.", "Jeder Zug ist eine Entscheidung. Jeder Sieg eine Belohnung.", "Denke drei Züge voraus, gewinne in USDC.", "Beweise, wer am Brett stärker ist.", "Können entscheidet alles. Spiele und gewinne."],
    lb: ["des Pots an den Gewinner", "USDC Einsatz", "Zeitmodi", "Gebühr bei Remis"], how: "So startest du",
    st: ["Anmelden oder Wallet verbinden", "Spiel erstellen oder Herausforderung annehmen", "Gewinnen und Preis abholen"],
    tr: ["Einsätze hält ein Smart Contract, nicht wir", "Remis oder Abbruch: volle Rückerstattung", "Den Gewinn holst du selbst mit einem Klick ab", "Die 10 % Gebühr hält die App werbefrei"],
    resp: "18+. Das Ergebnis hängt von deinem Können ab, ein Gewinn ist aber nicht garantiert. Spiele verantwortungsvoll.",
  },
  fr: {
    net: "Réseau Polygon · USDC · frais minimes", h1: "Échecs pour USDC", sub: "Affrontez des adversaires du monde entier. Le gagnant reçoit 90 % de la cagnotte directement dans son portefeuille.",
    cta: "Jouer pour des USDC", ctaBot: "S’entraîner contre le bot, gratuit",
    sl: ["Votre esprit est votre meilleur atout.", "Chaque coup est une décision. Chaque victoire, une récompense.", "Voyez trois coups d’avance, gagnez en USDC.", "Prouvez qui est le plus fort sur l’échiquier.", "L’habileté décide de tout. Jouez et gagnez."],
    lb: ["de la cagnotte au gagnant", "USDC de mise", "cadences de temps", "de frais en cas de nulle"], how: "Pour commencer",
    st: ["Connectez-vous ou liez un portefeuille", "Créez une partie ou relevez un défi", "Gagnez et récupérez votre gain"],
    tr: ["Les mises sont gardées par un smart contract, pas par nous", "Nulle ou annulation : remboursement total", "Vous récupérez vos gains vous-même en un clic", "Les 10 % de frais gardent l’app sans publicité"],
    resp: "18+. Le résultat dépend de votre habileté, mais gagner n’est pas garanti. Jouez de façon responsable.",
  },
  pt: {
    net: "Rede Polygon · USDC · taxas mínimas", h1: "Xadrez por USDC", sub: "Jogue contra adversários do mundo todo. O vencedor recebe 90% do prêmio direto na carteira.",
    cta: "Jogar por USDC", ctaBot: "Treine com o bot, grátis",
    sl: ["Sua mente é o seu maior ativo.", "Cada lance é uma decisão. Cada vitória, uma recompensa.", "Pense três lances à frente e vença em USDC.", "Prove quem é mais forte no tabuleiro.", "A habilidade decide tudo. Jogue e vença."],
    lb: ["do prêmio ao vencedor", "USDC de aposta", "modos de tempo", "de taxa no empate"], how: "Como começar",
    st: ["Entre ou conecte uma carteira", "Crie um jogo ou aceite um desafio", "Vença e resgate seu prêmio"],
    tr: ["As apostas ficam num contrato inteligente, não conosco", "Empate ou cancelamento: reembolso total", "Você mesmo resgata o prêmio com um botão", "A taxa de 10% mantém o app sem anúncios"],
    resp: "18+. O resultado depende da sua habilidade, mas vencer não é garantido. Jogue com responsabilidade.",
  },
  tr: {
    net: "Polygon ağı · USDC · çok düşük ücretler", h1: "USDC için satranç", sub: "Dünyanın her yerinden rakiplerle oynayın. Kazanan, havuzun %90’ını doğrudan cüzdanına alır.",
    cta: "USDC için oyna", ctaBot: "Botla antrenman, ücretsiz",
    sl: ["Zihniniz en büyük varlığınızdır.", "Her hamle bir karar. Her zafer bir ödül.", "Üç hamle ilerisini düşünün, USDC kazanın.", "Tahtada kimin güçlü olduğunu kanıtlayın.", "Beceri her şeyi belirler. Oynayın ve kazanın."],
    lb: ["havuzdan kazanana", "USDC bahis", "süre seçeneği", "beraberlikte komisyon"], how: "Nasıl başlanır",
    st: ["Giriş yapın veya cüzdan bağlayın", "Oyun oluşturun veya meydan okumayı kabul edin", "Kazanın ve ödülünüzü alın"],
    tr: ["Bahisleri biz değil, akıllı sözleşme tutar", "Beraberlik veya iptal: tam iade", "Kazancı tek tuşla kendiniz alırsınız", "%10 komisyon uygulamayı reklamsız tutar"],
    resp: "18+. Sonuç becerinize bağlıdır ancak kazanç garanti değildir. Sorumlu oynayın.",
  },
  zh: {
    net: "Polygon 网络 · USDC · 极低手续费", h1: "用 USDC 下国际象棋", sub: "与来自世界各地的对手对弈。获胜者直接把奖池的 90% 收入自己的钱包。",
    cta: "开始 USDC 对弈", ctaBot: "免费练习：对战机器人",
    sl: ["你的头脑是你最大的资产。", "每一步都是决策，每一次胜利都是奖励。", "多想三步，赢取 USDC。", "在棋盘上证明谁更强。", "实力决定一切，来下棋、去获胜。"],
    lb: ["奖池归获胜者", "USDC 赌注", "种用时模式", "和棋手续费"], how: "如何开始",
    st: ["登录或连接钱包", "创建对局或接受挑战", "获胜并领取奖金"],
    tr: ["赌注由智能合约保管，而不是我们", "和棋或取消：全额退还赌注", "奖金由你自己一键领取", "10% 手续费让应用保持无广告"],
    resp: "18+。结果取决于你的棋艺，但不保证获胜。请理性游戏。",
  },
  ja: {
    net: "Polygonネットワーク · USDC · 超低手数料",
    h1: "USDCで遊ぶチェス",
    sub: "世界中の対戦相手と対局しましょう。勝者はプールの90%をそのままウォレットで受け取れます。",
    cta: "USDCで対戦する",
    ctaBot: "ボットと練習（無料）",
    sl: ["あなたの頭脳が最大の資産。", "一手一手が決断。一勝一勝が報酬。", "三手先を読んで、USDCで勝とう。", "盤上で誰が強いか証明しよう。", "勝負を決めるのは実力。遊んで、勝とう。"],
    lb: ["勝者がプールから受け取る割合", "USDCの賭け金", "持ち時間モード", "引き分け時の手数料"],
    how: "はじめ方",
    st: ["サインインするかウォレットを接続", "ゲームを作成するか、挑戦を受ける", "勝って賞金を受け取る"],
    tr: ["賭け金を保管するのは私たちではなくスマートコントラクト", "引き分け・キャンセル：賭け金は全額返金", "賞金はボタン一つでご自身が受け取れます", "10%の手数料でアプリは広告なしで運営されます"],
    resp: "18歳以上。結果は実力次第ですが、勝利は保証されません。責任を持って遊びましょう。",
  },
  ko: {
    net: "Polygon 네트워크 · USDC · 초저수수료",
    h1: "USDC로 즐기는 체스",
    sub: "전 세계 상대와 대국하세요. 승자는 상금의 90%를 지갑으로 바로 받습니다.",
    cta: "USDC로 플레이",
    ctaBot: "봇과 연습 (무료)",
    sl: ["당신의 두뇌가 가장 큰 자산입니다.", "한 수 한 수가 결정, 한 판 한 판이 보상.", "세 수 앞을 읽고 USDC로 이기세요.", "체스판에서 누가 더 강한지 증명하세요.", "실력이 모든 것을 결정합니다. 플레이하고 승리하세요."],
    lb: ["승자에게 돌아가는 상금 비율", "USDC 판돈", "시간 모드", "무승부 시 수수료"],
    how: "시작하기",
    st: ["로그인하거나 지갑 연결", "게임을 만들거나 도전을 수락", "이기고 상금 수령"],
    tr: ["판돈은 우리가 아니라 스마트 컨트랙트가 보관합니다", "무승부·취소: 판돈 전액 환불", "상금은 버튼 하나로 직접 수령합니다", "10% 수수료 덕분에 앱에 광고가 없습니다"],
    resp: "만 18세 이상. 결과는 실력에 달려 있지만 승리가 보장되지는 않습니다. 책임감 있게 플레이하세요.",
  },
  hi: {
    net: "Polygon नेटवर्क · USDC · बेहद कम शुल्क",
    h1: "USDC के लिए शतरंज",
    sub: "दुनिया भर के विरोधियों के साथ खेलें। विजेता को पॉट का 90% सीधे उसके वॉलेट में मिलता है।",
    cta: "USDC के लिए खेलें",
    ctaBot: "बॉट के साथ अभ्यास करें — मुफ़्त",
    sl: ["आपका दिमाग ही आपकी सबसे बड़ी पूँजी है।", "हर चाल एक फ़ैसला है, हर जीत एक इनाम।", "तीन चाल आगे सोचें, USDC में जीतें।", "बोर्ड पर साबित करें कि कौन ज़्यादा मज़बूत है।", "कौशल ही सब तय करता है। खेलें और जीतें।"],
    lb: ["पॉट का हिस्सा विजेता को", "USDC दाँव", "समय मोड", "ड्रॉ पर शुल्क"],
    how: "शुरू कैसे करें",
    st: ["साइन इन करें या वॉलेट कनेक्ट करें", "गेम बनाएँ या चुनौती स्वीकार करें", "जीतें और अपना इनाम लें"],
    tr: ["दाँव हम नहीं, स्मार्ट कॉन्ट्रैक्ट रखता है", "ड्रॉ या रद्द: दाँव पूरा वापस", "जीत की राशि आप एक बटन से खुद लेते हैं", "10% शुल्क ऐप को विज्ञापन-मुक्त रखता है"],
    resp: "18+. नतीजा आपके कौशल पर निर्भर है, पर जीत की गारंटी नहीं है। ज़िम्मेदारी से खेलें।",
  },
  ar: {
    net: "شبكة Polygon · USDC · رسوم منخفضة جدًا", h1: "شطرنج مقابل USDC", sub: "العب ضد خصوم من كل أنحاء العالم. يحصل الفائز على 90% من الجائزة مباشرة في محفظته.",
    cta: "العب مقابل USDC", ctaBot: "تدرّب مع الروبوت مجانًا",
    sl: ["عقلك هو أكبر أصولك.", "كل نقلة قرار، وكل فوز مكافأة.", "فكّر بثلاث نقلات مقدّمًا واربح بعملة USDC.", "أثبت من الأقوى على الرقعة.", "المهارة تحسم كل شيء. العب وانتصر."],
    lb: ["من الجائزة للفائز", "USDC للرهان", "أنماط للوقت", "رسوم عند التعادل"], how: "كيف تبدأ",
    st: ["سجّل الدخول أو اربط محفظة", "أنشئ لعبة أو اقبل تحديًا", "فُز واستلم جائزتك"],
    tr: ["العقد الذكي يحفظ الرهانات وليس نحن", "تعادل أو إلغاء: استرداد كامل", "تستلم أرباحك بنفسك بضغطة زر", "رسوم 10% تُبقي التطبيق خاليًا من الإعلانات"],
    resp: "+18. النتيجة تعتمد على مهارتك لكن الفوز غير مضمون. العب بمسؤولية.",
  },
};

const PIECES = ["♞", "♜", "♝", "♛", "♚", "♟", "♘"];

function Count({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 1.4, onUpdate: (l) => setV(Math.round(l)) }); return () => c.stop(); }, [to]);
  return <>{v}</>;
}

function Slogan({ list, className = "" }: { list: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 3800); return () => clearInterval(t); }, []);
  const k = i % list.length;
  return (
    <div className={`min-h-[3.2rem] grid place-items-center ${className}`} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p key={k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.45 }}
          className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
          {list[k]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function Hero({ onBot, onEarn }: { onBot: () => void; onEarn?: () => void }) {
  const { lang, dark } = useApp();
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const reduce = useReducedMotion();
  const x = D[lang] ?? D.en;
  const start = () => { void connect({ client, chain, wallets, theme: dark ? "dark" : "light", size: "compact", title: "Chess Bet" }); };

  // Уже вошедшему игроку показываем только короткий мотивирующий слоган
  if (account) {
    return (
      <div className="space-y-3">
        <div className="card text-center !py-3 !bg-gradient-to-r from-brand-600/20 to-brand-violet/20">
          <Slogan list={x.sl} />
        </div>
        <TrustBlock />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-xl2 border border-violet-300/20 text-white text-center px-5 py-9 sm:py-12 space-y-6 bg-gradient-to-br from-ink-700 via-ink-900 to-ink-950 shadow-glow">
      {/* фон: светящиеся шары, шахматная сетка и парящие фигуры */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {!reduce && <>
          <motion.span className="absolute -top-24 -start-16 w-72 h-72 rounded-full bg-violet-600/40 blur-3xl" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 9, repeat: Infinity }} />
          <motion.span className="absolute -bottom-24 -end-16 w-72 h-72 rounded-full bg-sky-500/30 blur-3xl" animate={{ x: [0, -40, 0], y: [0, -20, 0] }} transition={{ duration: 11, repeat: Infinity }} />
        </>}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "conic-gradient(#fff 25%, transparent 0 50%, #fff 0 75%, transparent 0)", backgroundSize: "56px 56px", maskImage: "radial-gradient(circle at 50% 40%, #000, transparent 75%)", WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000, transparent 75%)" }} />
        {!reduce && PIECES.map((p, i) => (
          <motion.span key={i} className="absolute text-3xl sm:text-4xl opacity-20 select-none" style={{ left: `${6 + i * 14}%`, top: `${i % 2 ? 68 : 8}%` }}
            animate={{ y: [0, -22, 0], rotate: [-10, 10, -10] }} transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}>{p}</motion.span>
        ))}
      </div>

      <div className="relative space-y-3">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.9 }} className="text-6xl">♞</motion.div>
        <div className="inline-block rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/80">⬡ {x.net}</div>
        <motion.h1 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="text-3xl sm:text-5xl font-extrabold tracking-tight">{x.h1}</motion.h1>
        <Slogan list={x.sl} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-sm sm:text-base text-white/75 max-w-xl mx-auto">{x.sub}</motion.p>
      </div>

      <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={start} className="btn btn-primary text-base px-7 py-3.5 shadow-glow">♛ {x.cta}</motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBot} className="btn text-base px-6 py-3.5 text-[#06293a]" style={{ background: "linear-gradient(90deg,#22d8f0,#1cb0f6)", boxShadow: "0 4px 0 rgba(0,0,0,.2)" }}>🤖 {x.ctaBot}</motion.button>
        {onEarn && <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onEarn} className="btn text-base px-6 py-3.5 text-[#3a2300]" style={{ background: "linear-gradient(90deg,#ffc800,#ff9600)", boxShadow: "0 4px 0 rgba(0,0,0,.2)" }}>💰 {lang === "ru" ? "Заработай" : "Earn"}</motion.button>}
      </div>

      <TrustBlock className="relative" />

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[<><Count to={94} />%</>, "0.5-500", "6", "0%"].map((v, i) => (
          <motion.div key={i} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }} className="rounded-2xl bg-white/5 border border-white/10 py-3 px-2">
            <div className="mono text-2xl font-extrabold bg-gradient-to-r from-violet-300 to-sky-300 bg-clip-text text-transparent" dir="ltr">{v}</div>
            <div className="text-[11px] text-white/65 leading-tight mt-0.5">{x.lb[i]}</div>
          </motion.div>
        ))}
      </div>

      <div className="relative text-start space-y-2">
        <div className="text-xs uppercase tracking-wider text-white/50 text-center">{x.how}</div>
        <div className="grid sm:grid-cols-3 gap-2">
          {x.st.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-2.5">
              <span className="shrink-0 w-7 h-7 grid place-items-center rounded-full bg-gradient-to-r from-brand-600 to-brand-violet text-xs font-bold">{i + 1}</span>
              <span className="text-sm">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="relative text-xs text-white/70 grid sm:grid-cols-2 gap-1.5">
        {x.tr.map((s, i) => <li key={i}>✓ {s}</li>)}
      </ul>
      <p className="relative text-[11px] text-white/45">{x.resp}</p>
    </section>
  );
}
