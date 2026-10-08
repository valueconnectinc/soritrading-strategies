/*
 * @coinsori-strategy v1
 * name: SOL 4H Volume-Confirmed Keltner MR
 * ex: binance
 * syms: SOL
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy:
 * SOL mean-reversion is the validated edge in this account. Adding a volume
 * confirmation (only take the bounce when it comes with real participation) is
 * meant to filter out dead bounces and improve signal quality.
 * When it buys and sells:
 * Buys when price closes below the lower Keltner band AND RSI is below 30 AND
 * volume is above its 20-bar average. Sells when price returns to the middle band
 * or RSI recovers above 55. Hard stop at 2x ATR below entry.
 * When it does NOT work:
 * In a strong downtrend, "oversold" keeps getting more oversold and every bounce
 * fails — this loses during sustained bear legs without a trend filter.
 */
function onUpdate(ctx) {
  const k = ctx.bb(20, 2, 1);        // Keltner-like bands via BB(20,2) on closed bars
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  const price = ctx.price;

  if (k == null || rsi == null || atr == null || avgVol == null) return null;

  const inPos = ctx.position > 0;
  const entry = ctx.entryPx || 0;

  // EXIT: bounce to middle band, RSI recovered, or 2x ATR stop
  if (inPos) {
    if (price >= k.mid || rsi > 55 || (entry > 0 && price <= entry - 2 * atr)) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // ENTRY: below lower band + deeply oversold + above-average volume
  if (price < k.lower && rsi < 30 && vol > avgVol) {
    const qty = Math.min(ctx.cash * 0.02 / (2 * atr), ctx.cash / price * 0.99);
    return { side: 'buy', qty };
  }
  return null;
}
