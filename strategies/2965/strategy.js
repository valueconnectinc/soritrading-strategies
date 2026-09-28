/*
 * @coinsori-strategy v1
 * name: SOL 1D Dual-Mode Trend Ride + Defensive MR
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ATR-adaptive Keltner mean-reversion core defends
 * in chop/bear but sits in cash during melt-ups. This dual-mode version rides strong
 * uptrends with a trailing stop (capturing the melt-up) and falls back to the
 * defensive MR core when not in a strong trend. The two modes are mutually exclusive
 * with separate entry/exit paths so they never clash.
 * When it buys and sells: TREND mode holds long when price is above a rising 100-day
 * average (a slow, robust uptrend signal), exiting only on a 3x-ATR trailing stop
 * below the recent high or a close below the 100-day average. MR mode (only when not
 * trend-riding) buys oversold flushes below the ATR-adaptive lower Keltner band with
 * RSI<40 inside a rising 200-day uptrend, selling on snap-back above the mid band.
 * When it does NOT work: In a choppy range-bound market the trend gate whipsaws and
 * the trailing stop churns some fees — the pure MR is better there. In a violent
 * crash the trailing stop still realizes a loss before the defensive mode re-engages.
 * It trades more than the pure MR and pays more fees.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const sma100 = ctx.sma(100, 1);
  const sma100prev = ctx.sma(100, 2);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null ||
      sma100 == null || sma100prev == null) return null;

  // TREND MODE gate: slow robust uptrend — price above a rising 100-day average.
  const trendUp = price > sma100 && sma100 > sma100prev;

  // MR MODE gate: defensive mean reversion inside healthy long-term uptrend.
  const lowerBand = ema20 - 2.5 * atr;
  const uptrend = sma200 > sma200prev;

  if (pos > 0) {
    // If we are in a trend ride, exit on a 3x-ATR trailing stop below the recent high
    // or a close below the 100-day average (trend broken).
    if (trendUp) {
      const hi = ctx.high(50, 1); // highest high over last 50 closed bars
      if (hi == null) return null;
      const trailStop = hi - 3 * atr;
      if (price < trailStop || price < sma100) {
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Otherwise we are in an MR position — exit on snap-back above mid band or RSI up.
    if (price > ema20 || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter trend mode on a confirmed strong uptrend.
  if (trendUp) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  // Otherwise defensive MR entry: oversold flush below ATR-adaptive band in uptrend.
  if (uptrend && price < lowerBand && rsi < 40) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
