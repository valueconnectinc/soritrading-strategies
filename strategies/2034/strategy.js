/*
 * @coinsori-strategy v1
 * name: RSI Regime Adaptive
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossovers (strategies 2030, 2033) lag in both
 * chop and strong trends — too slow to enter, too slow to exit. This
 * strategy uses RSI as a regime detector: above 55 = trending, below 45
 * = chop. In trending mode it holds longs aggressively; in chop it exits
 * and waits. ATR rising confirms momentum, ATR falling warns of reversal.
 * Inspired by the promising ATR-regime-adaptive result on AVAXUSDT (exp 489).
 * When it buys and sells: Buy when RSI crosses above 50 (entering trend).
 * Sell when RSI drops below 40 (momentum gone) or price retraces 2.5× ATR
 * from peak. No entry when RSI is between 40-55 (uncertain zone).
 * When it does NOT work: In slow grind uptrends where RSI stays in the
 * 50-60 range without clear crosses, the strategy enters late. ATR stop
 * can be too loose in volatile periods.
 */

function onUpdate(ctx) {
  const s = ctx.state;

  // Detect new bar for stable crossover detection
  if (s.lastBarI !== ctx.i) {
    s.lastBarI = ctx.i;
    s.snapRsi  = ctx.rsi(14);
    s.snapAtr  = ctx.atr(14);
  }

  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);
  const prevRsi = s.snapRsi || ctx.rsi(14, 1);
  const prevAtr = s.snapAtr || ctx.atr(14, 1);

  if (rsi == null || atr == null || prevRsi == null || prevAtr == null) return null;

  const px  = ctx.price;
  const pos = ctx.position;

  // ── Regime detection ─────────────────────────────────────────────────────────
  // RSI cross above 50 = trend mode starting
  const rsiCrossUp  = prevRsi <= 50 && rsi > 50;
  const rsiCrossDown = prevRsi >= 40 && rsi < 40;

  // ATR direction: rising = momentum building, falling = fading
  const atrRising = atr > prevAtr;

  // ── Entry: Long (RSI entering trend zone) ───────────────────────────────────
  if (pos === 0) {
    // Only enter in clear trend: RSI crossed above 50 AND ATR rising (momentum)
    if (rsiCrossUp && atrRising) {
      const qty = ctx.cash / px * 0.99;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit ─────────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Exit on RSI momentum loss
    if (rsiCrossDown) {
      return { side: 'sell', qty: pos };
    }
    // ATR-based stop: 2.5× ATR from highest price since entry
    const highSinceEntry = s.highSinceEntry || px;
    s.highSinceEntry = Math.max(highSinceEntry, px);
    const stopPx = s.highSinceEntry - 2.5 * atr;
    if (px < stopPx) {
      s.highSinceEntry = px;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  return null;
}
