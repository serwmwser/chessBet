"use client";
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { BUY_POL_URL, BUY_USDC_URL } from "@/lib/links";
import { useApp } from "@/lib/ctx";
import type { Lang } from "@/lib/i18n";

type K = "title" | "intro" | "buyPol" | "buyUsdc" | "polNote" | "usdcNote" | "steps" | "warn" | "addr" | "copy" | "copied" | "partner";

const D: Record<Lang, Record<K, string>> = {
  ru: {
    title: "Пополнить баланс", intro: "В игре все ставки и выигрыши идут в USDC в сети Polygon. USDC нужен, чтобы создать игру или присоединиться к ней. Немного POL нужно для комиссии сети.",
    buyPol: "Купить POL на бирже", buyUsdc: "Купить USDC на бирже", polNote: "POL: оплата комиссий сети. Для начала хватит 1–2 POL.", usdcNote: "USDC: ваши ставки. Минимальная ставка 0.5 USDC.",
    steps: "1) Купите монету на бирже. 2) Выведите её на адрес ниже. 3) Через пару минут она появится в балансе.",
    warn: "При выводе выбирайте только сеть Polygon (POL / MATIC). Другая сеть приведёт к потере средств. Сначала отправьте небольшую сумму для проверки.",
    addr: "Ваш адрес для вывода", copy: "Скопировать", copied: "Скопировано", partner: "Ссылки на биржу партнёрские. Доступность биржи зависит от вашей страны. Это не финансовая рекомендация.",
  },
  en: {
    title: "Top up your balance", intro: "All stakes and winnings in the game are in USDC on the Polygon network. You need USDC to create or join a game. A little POL is needed for network fees.",
    buyPol: "Buy POL on an exchange", buyUsdc: "Buy USDC on an exchange", polNote: "POL pays network fees. 1–2 POL is enough to start.", usdcNote: "USDC is your stake. The minimum stake is 0.5 USDC.",
    steps: "1) Buy the coin on the exchange. 2) Withdraw it to the address below. 3) It shows up in your balance in a couple of minutes.",
    warn: "When withdrawing, choose only the Polygon network (POL / MATIC). Any other network will lose your funds. Send a small test amount first.",
    addr: "Your withdrawal address", copy: "Copy", copied: "Copied", partner: "Exchange links are partner links. Availability depends on your country. This is not financial advice.",
  },
  es: {
    title: "Recargar saldo", intro: "En el juego todas las apuestas y ganancias son en USDC en la red Polygon. Necesitas USDC para crear una partida o unirte. Hace falta un poco de POL para las comisiones de red.",
    buyPol: "Comprar POL en un exchange", buyUsdc: "Comprar USDC en un exchange", polNote: "POL paga las comisiones de red. 1–2 POL bastan para empezar.", usdcNote: "USDC es tu apuesta. La apuesta mínima es 0.5 USDC.",
    steps: "1) Compra la moneda en el exchange. 2) Retírala a la dirección de abajo. 3) En un par de minutos aparece en tu saldo.",
    warn: "Al retirar elige solo la red Polygon (POL / MATIC). Cualquier otra red hará que pierdas los fondos. Envía primero una cantidad pequeña de prueba.",
    addr: "Tu dirección de retiro", copy: "Copiar", copied: "Copiado", partner: "Los enlaces al exchange son de afiliado. La disponibilidad depende de tu país. No es asesoramiento financiero.",
  },
  de: {
    title: "Guthaben aufladen", intro: "Im Spiel laufen alle Einsätze und Gewinne in USDC im Polygon-Netzwerk. Du brauchst USDC, um ein Spiel zu erstellen oder beizutreten. Etwas POL wird für Netzwerkgebühren gebraucht.",
    buyPol: "POL an der Börse kaufen", buyUsdc: "USDC an der Börse kaufen", polNote: "POL bezahlt Netzwerkgebühren. 1–2 POL reichen für den Anfang.", usdcNote: "USDC ist dein Einsatz. Der Mindesteinsatz beträgt 0,05 USDC.",
    steps: "1) Kaufe die Münze an der Börse. 2) Überweise sie an die Adresse unten. 3) Nach ein paar Minuten erscheint sie im Guthaben.",
    warn: "Wähle bei der Auszahlung nur das Polygon-Netzwerk (POL / MATIC). Jedes andere Netzwerk führt zum Verlust der Mittel. Sende zuerst einen kleinen Testbetrag.",
    addr: "Deine Auszahlungsadresse", copy: "Kopieren", copied: "Kopiert", partner: "Börsen-Links sind Partnerlinks. Verfügbarkeit hängt von deinem Land ab. Keine Finanzberatung.",
  },
  fr: {
    title: "Recharger le solde", intro: "Dans le jeu, toutes les mises et tous les gains sont en USDC sur le réseau Polygon. Il faut des USDC pour créer ou rejoindre une partie. Un peu de POL sert aux frais de réseau.",
    buyPol: "Acheter du POL sur une plateforme", buyUsdc: "Acheter des USDC sur une plateforme", polNote: "Le POL paie les frais de réseau. 1–2 POL suffisent pour commencer.", usdcNote: "L’USDC est votre mise. La mise minimale est de 0,05 USDC.",
    steps: "1) Achetez la crypto sur la plateforme. 2) Retirez-la vers l’adresse ci-dessous. 3) Elle apparaît dans votre solde en quelques minutes.",
    warn: "Au retrait, choisissez uniquement le réseau Polygon (POL / MATIC). Tout autre réseau entraîne la perte des fonds. Envoyez d’abord un petit montant test.",
    addr: "Votre adresse de retrait", copy: "Copier", copied: "Copié", partner: "Les liens vers la plateforme sont des liens partenaires. La disponibilité dépend de votre pays. Ce n’est pas un conseil financier.",
  },
  pt: {
    title: "Adicionar saldo", intro: "No jogo, todas as apostas e prêmios são em USDC na rede Polygon. Você precisa de USDC para criar ou entrar em um jogo. Um pouco de POL é necessário para as taxas da rede.",
    buyPol: "Comprar POL em uma corretora", buyUsdc: "Comprar USDC em uma corretora", polNote: "POL paga as taxas da rede. 1–2 POL bastam para começar.", usdcNote: "USDC é a sua aposta. A aposta mínima é 0,05 USDC.",
    steps: "1) Compre a moeda na corretora. 2) Saque para o endereço abaixo. 3) Em alguns minutos ela aparece no saldo.",
    warn: "Ao sacar, escolha apenas a rede Polygon (POL / MATIC). Qualquer outra rede faz você perder os fundos. Envie antes um valor pequeno de teste.",
    addr: "Seu endereço de saque", copy: "Copiar", copied: "Copiado", partner: "Os links da corretora são de parceria. A disponibilidade depende do seu país. Não é aconselhamento financeiro.",
  },
  tr: {
    title: "Bakiye yükle", intro: "Oyunda tüm bahisler ve kazançlar Polygon ağında USDC ile yapılır. Oyun oluşturmak veya katılmak için USDC gerekir. Ağ ücretleri için biraz POL gerekir.",
    buyPol: "Borsadan POL satın al", buyUsdc: "Borsadan USDC satın al", polNote: "POL ağ ücretlerini öder. Başlamak için 1–2 POL yeterli.", usdcNote: "USDC bahsinizdir. Minimum bahis 0,05 USDC.",
    steps: "1) Borsadan coini satın alın. 2) Aşağıdaki adrese çekin. 3) Birkaç dakika içinde bakiyenizde görünür.",
    warn: "Çekim yaparken yalnızca Polygon ağını (POL / MATIC) seçin. Başka bir ağ fon kaybına yol açar. Önce küçük bir test tutarı gönderin.",
    addr: "Çekim adresiniz", copy: "Kopyala", copied: "Kopyalandı", partner: "Borsa bağlantıları ortaklık bağlantılarıdır. Erişilebilirlik ülkenize bağlıdır. Finansal tavsiye değildir.",
  },
  zh: {
    title: "充值余额", intro: "游戏中所有赌注和奖金均为 Polygon 网络上的 USDC。创建或加入对局需要 USDC，网络手续费需要少量 POL。",
    buyPol: "在交易所购买 POL", buyUsdc: "在交易所购买 USDC", polNote: "POL 用于支付网络手续费，开始时 1–2 个 POL 就够了。", usdcNote: "USDC 是你的赌注，最低赌注为 0.5 USDC。",
    steps: "1）在交易所购买代币。2）提现到下方地址。3）几分钟后会显示在余额中。",
    warn: "提现时只选择 Polygon 网络（POL / MATIC），选择其他网络会导致资金丢失。请先转一小笔测试金额。",
    addr: "你的提现地址", copy: "复制", copied: "已复制", partner: "交易所链接为合作推广链接，是否可用取决于你所在的国家，非投资建议。",
  },
  ja: {
    title: "残高をチャージ",
    intro: "ゲーム内の賭け金と賞金はすべてPolygonネットワーク上のUSDCです。ゲームの作成や参加にはUSDCが必要です。ネットワーク手数料のために少量のPOLも必要です。",
    buyPol: "取引所でPOLを購入",
    buyUsdc: "取引所でUSDCを購入",
    polNote: "POLはネットワーク手数料の支払いに使います。1〜2 POLあれば始められます。",
    usdcNote: "USDCは賭け金です。最低賭け金は0.5 USDCです。",
    steps: "1) 取引所でコインを購入。2) 下のアドレスへ出金。3) 数分で残高に反映されます。",
    warn: "出金時は必ずPolygonネットワーク（POL / MATIC）だけを選んでください。他のネットワークを選ぶと資金を失います。最初は少額でテスト送金してください。",
    addr: "あなたの出金先アドレス",
    copy: "コピー",
    copied: "コピーしました",
    partner: "取引所へのリンクはパートナーリンクです。利用可否はお住まいの国によって異なります。投資アドバイスではありません。",
  },
  ko: {
    title: "잔액 충전",
    intro: "게임의 모든 판돈과 상금은 Polygon 네트워크의 USDC입니다. 게임을 만들거나 참가하려면 USDC가 필요합니다. 네트워크 수수료를 위해 소량의 POL도 필요합니다.",
    buyPol: "거래소에서 POL 구매",
    buyUsdc: "거래소에서 USDC 구매",
    polNote: "POL은 네트워크 수수료를 내는 데 쓰입니다. 시작하려면 1~2 POL이면 충분합니다.",
    usdcNote: "USDC는 판돈입니다. 최소 판돈은 0.5 USDC입니다.",
    steps: "1) 거래소에서 코인을 구매합니다. 2) 아래 주소로 출금합니다. 3) 몇 분 안에 잔액에 표시됩니다.",
    warn: "출금할 때는 반드시 Polygon 네트워크(POL / MATIC)만 선택하세요. 다른 네트워크를 선택하면 자금을 잃게 됩니다. 먼저 소액으로 테스트 전송을 해 보세요.",
    addr: "내 출금 주소",
    copy: "복사",
    copied: "복사됨",
    partner: "거래소 링크는 제휴 링크입니다. 이용 가능 여부는 국가에 따라 다릅니다. 투자 조언이 아닙니다.",
  },
  hi: {
    title: "अपना बैलेंस टॉप अप करें",
    intro: "गेम में सभी दाँव और जीत की राशि Polygon नेटवर्क पर USDC में होती है। गेम बनाने या उसमें शामिल होने के लिए USDC चाहिए। नेटवर्क शुल्क के लिए थोड़ा POL भी चाहिए।",
    buyPol: "एक्सचेंज पर POL खरीदें",
    buyUsdc: "एक्सचेंज पर USDC खरीदें",
    polNote: "POL नेटवर्क शुल्क चुकाता है। शुरू करने के लिए 1–2 POL काफ़ी है।",
    usdcNote: "USDC आपका दाँव है। न्यूनतम दाँव 0.5 USDC है।",
    steps: "1) एक्सचेंज पर सिक्का खरीदें। 2) उसे नीचे दिए पते पर निकालें। 3) कुछ ही मिनटों में वह आपके बैलेंस में दिखेगा।",
    warn: "निकासी के समय केवल Polygon नेटवर्क (POL / MATIC) चुनें। कोई और नेटवर्क चुनने पर आपका पैसा खो जाएगा। पहले थोड़ी राशि टेस्ट के तौर पर भेजें।",
    addr: "आपका निकासी पता",
    copy: "कॉपी करें",
    copied: "कॉपी हो गया",
    partner: "एक्सचेंज के लिंक पार्टनर लिंक हैं। उपलब्धता आपके देश पर निर्भर है। यह वित्तीय सलाह नहीं है।",
  },
  ar: {
    title: "شحن الرصيد", intro: "في اللعبة تتم جميع الرهانات والأرباح بعملة USDC على شبكة Polygon. تحتاج USDC لإنشاء لعبة أو الانضمام إليها، وقليلًا من POL لرسوم الشبكة.",
    buyPol: "اشترِ POL من منصة تداول", buyUsdc: "اشترِ USDC من منصة تداول", polNote: "يُستخدم POL لدفع رسوم الشبكة. يكفي 1–2 POL للبدء.", usdcNote: "USDC هو رهانك. الحد الأدنى للرهان 0.5 USDC.",
    steps: "1) اشترِ العملة من المنصة. 2) اسحبها إلى العنوان أدناه. 3) تظهر في رصيدك خلال دقائق.",
    warn: "عند السحب اختر شبكة Polygon فقط (POL / MATIC). أي شبكة أخرى تعني ضياع الأموال. أرسل مبلغًا تجريبيًا صغيرًا أولًا.",
    addr: "عنوان السحب الخاص بك", copy: "نسخ", copied: "تم النسخ", partner: "روابط المنصة هي روابط شراكة. التوفر يعتمد على بلدك. هذه ليست نصيحة مالية.",
  },
};

export default function BuyCrypto() {
  const { lang } = useApp();
  const account = useActiveAccount();
  const [copied, setCopied] = useState(false);
  const x = (D[lang] ?? D.en);
  const addr = account?.address;
  const copy = async () => {
    if (!addr) return;
    try { await navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* буфер недоступен */ }
  };
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-bold">💳 {x.title}</h2>
      <p className="text-sm opacity-80">{x.intro}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <a className="btn btn-primary" href={BUY_POL_URL} target="_blank" rel="noopener noreferrer sponsored">{x.buyPol}</a>
        <a className="btn btn-primary" href={BUY_USDC_URL} target="_blank" rel="noopener noreferrer sponsored">{x.buyUsdc}</a>
      </div>
      <ul className="text-xs opacity-70 space-y-0.5">
        <li>• {x.polNote}</li>
        <li>• {x.usdcNote}</li>
      </ul>
      <p className="text-sm">{x.steps}</p>
      <p className="text-sm rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 px-3 py-2">⚠️ {x.warn}</p>
      {addr && (
        <div className="space-y-1">
          <div className="text-xs opacity-60">{x.addr}</div>
          <div className="flex items-center gap-2">
            <code className="mono text-xs break-all flex-1 rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2" dir="ltr">{addr}</code>
            <button className="chip chip-on shrink-0" onClick={copy}>{copied ? x.copied : x.copy}</button>
          </div>
        </div>
      )}
      <p className="text-[11px] opacity-50">{x.partner}</p>
    </section>
  );
}
