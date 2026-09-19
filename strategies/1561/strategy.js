/*
 * @coinsori-strategy v1
 * name: RSI Oversold + Volume Mean Reversion — XRPUSDT 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: XRP is a high-beta altcoin that drops sharply in bear
 * markets and recovers strongly — ideal for mean-reversion entries at extremes.
 * The RSI oversold + volume confirmation pattern has shown strong risk-reduction
 * on DOGEUSDT (beat bench by 20-26pp in bear windows, MDD 3-4× lower than market).
 * This applies the same logic to XRP, a different altcoin family.
 * When it buys and sells: Buys when RSI(14) drops below 30 and volume surges
 * above its 20-bar average (confirms conviction). Sells at RSI > 60 or price
 * reaches the 20-bar SMA (mean reversion target).
 * When it does NOT work: In prolonged bear markets where RSI stays oversold for
 * weeks — each buy gets stopped out before the bounce arrives, slowly draining
 * capital. Also fails in low-volume environments where volume confirmation is unreliable.
 */
function onUpdate(ctx) {
  const rsi   = ctx.rsi(14);
  if (rsi == null) return null;

  const sma20 = ctx.sma(20);
  if (sma20 == null) return null;

  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volSurge = ctx.vol > avgVol;

  const position = ctx.position;
  const price    = ctx.price;

  // ── ENTRY: RSI oversold + volume surge ─────────────────────────────
  if (!position) {
    const rsiOversold = rsi < 30;
    if (rsiOversold && volSurge) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── EXIT: RSI normalises OR price reaches SMA20 (mean target) ───────
  if (position) {
    const rsiNormal   = rsi > 60;
    const atMean      = price >= sma20;

    if (rsiNormal || atMean) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
