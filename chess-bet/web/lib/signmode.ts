// Автоматическая подпись работает в браузере кошелька, на компьютере и во встроенном кошельке (вход по почте).
// На телефоне в обычном браузере или приложении кошелёк открывается ссылкой, а Android разрешает это только по нажатию пользователя:
// если запросить подпись сразу после подключения, кошелёк не откроется. Поэтому там подпись просим по нажатию кнопки.
export function needsTap(walletId?: string): boolean {
  try {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const injected = !!(window as unknown as { ethereum?: unknown }).ethereum;
    return mobile && !injected && walletId !== "inApp";
  } catch { return false; }
}
