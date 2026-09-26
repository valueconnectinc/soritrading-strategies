/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian BTC 4H (no trend filter)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The crypto fear & greed index is a sentiment oscillator.
 * Crowds are most bearish at bottoms (extreme fear) and most bullish at tops
 * (extreme greed). Buying when fear is extreme and selling when greed turns
 * high is the classic contrarian bet. Here I DO NOT filter by trend: extreme
 * fear usually happens during crashes, which is exactly when a contrarian
 * should buy. A 6x-ATR stop caps the damage if the panic keeps falling.
 * When it buys and sells: buys when the fear-greed index is very low (<=25),
 * sells when it turns greedy (>=55) or the price hits the stop.
 * When it does NOT work: extreme fear can persist and deepen in a real crash,
 * so the stop is essential. Few trades — the index is a slow daily gauge, so
 * this is a low-frequency strategy that can sit in cash for long stretches.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (fg >= 55) {
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (fg <= 25) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
