/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze-Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Two different market behaviours are combined inside one
 * rising 200-day trend gate. Mean-reversion buys deep pullbacks to the lower
 * Keltner band, capturing snap-backs in healthy uptrends. Bollinger-squeeze
 * breakout buys a fresh 20-day high when volatility has compressed, capturing
 * the expansion leg. The two entries are complementary — one buys weakness,
 * the other buys strength — so the strategy stays productive in both pullback
 * and breakout regimes while the trend gate keeps it out of confirmed bears.
 * When it buys and sells: Buy either (a) a pullback to the lower Keltner band
 * (EMA20 - 2.5*ATR) with RSI<40, or (b) a close above the 20-day high when
 * Bollinger width is in the quietest 20% of the last 100 bars — but only while
 * the 200-day average is rising. Sell when price closes back below the 20-day
 * EMA (trend has turned).
 * When it does NOT work: It lags a straight-line melt-up because the breakout
 * entry waits for a compression first, and in a persistent bear the rising
 * 200-day gate keeps it flat (no upside). It is long-only, not a crash trader.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const bb = ctx.bb(20, 2, 1);
  if (sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  // The shared defensive gate: only trade inside a rising long-term trend.
  const uptrend = sma200 > sma200prev;

  // Keltner lower band for the mean-reversion entry.
  const keltnerLow = ema20 - 2.5 * atr;

  // Exit: trend has turned once price closes back below the 20-day EMA.
  if (pos > 0) {
    if (price < ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // --- Entry A: mean-reversion pullback to the Keltner lower band ---
  let mrEntry = false;
  if (rsi != null && rsi < 40 && price < keltnerLow) mrEntry = true;

  // --- Entry B: Bollinger-squeeze breakout ---
  let squeezeEntry = false;
  const closes = ctx.closes;
  if (bb != null && closes && closes.length >= 101) {
    // Bollinger width now vs. the quietest 20% of the last 100 bars.
    const widthNow = bb.upper - bb.lower;
    const widths = [];
    for (let k = closes.length - 100; k < closes.length; k++) {
      const b = ctx.bb(20, 2, closes.length - 1 - k);
      if (b == null) continue;
      widths.push(b.upper - b.lower);
    }
    if (widths.length >= 80) {
      widths.sort((a, b) => a - b);
      const quietThresh = widths[Math.floor(widths.length * 0.2)];
      const squeezed = widthNow <= quietThresh;
      // Fresh 20-day high breakout.
      const high20 = ctx.high(20, 1);
      if (squeezed && high20 != null && price > high20) squeezeEntry = true;
    }
  }

  if (mrEntry || squeezeEntry) {
    // ATR-scaled sizing: risk ~2.5% of equity per trade, capped at 95% of cash.
    const riskBudget = 0.025 * ctx.cash;
    let qty = riskBudget / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    qty = Math.min(qty, maxQty);
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
