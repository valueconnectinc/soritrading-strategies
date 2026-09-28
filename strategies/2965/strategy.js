/*
 * @coinsori-strategy v1
 * name: SOL 1D Strong-Trend Ride + Defensive MR
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ATR-adaptive Keltner mean-reversion core defends
 * in chop/bear but sits in cash during melt-ups. This dual-mode version rides ONLY
 * strong sustained uptrends (a strict golden-cross-style filter that stays out of
 * chop) with a trailing stop, capturing the melt-up, and otherwise uses the
 * defensive MR core. The strict trend gate is the key: it must not whipsaw in the
 * ranges that dominate SOL's recent history.
 * When it buys and sells: TREND mode requires price above the 200-day average, the
 * 50-day average above the 200-day (golden-cross structure) and both rising — a rare,
 * strong signal. It holds with a 3x-ATR trailing stop below the recent high and exits
 * when the golden-cross structure breaks. MR mode (only when not trend-riding) buys
 * oversold flushes below the ATR-adaptive lower Keltner band with RSI<40 inside a
 * rising 200-day uptrend, selling on snap-back above the mid band.
 * When it does NOT work: In a choppy range-bound market the trend gate rarely fires
 * so it mostly behaves like the pure MR (good), but when it does trigger on a false
 * breakout the trailing stop takes a hit. In a violent crash the trailing stop
 * realizes a loss before the defensive mode re-engages. It still trades more than
 * the pure MR.
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
  const sma50 = ctx.sma(50, 1);
  const sma50prev = ctx.sma(50, 2);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null ||
      sma50 == null || sma50prev == null) return null;

  // STRONG-TREND gate: golden-cross structure (50>200) with price above both and
  // both averages rising — rare, only fires in sustained melt-ups, stays out of chop.
  const trendUp = price > sma200 && sma50 > sma200 && sma50 > sma50prev && sma200 > sma200prev;

  // MR MODE gate: defensive mean reversion inside healthy long-term uptrend.
  const lowerBand = ema20 - 2.5 * atr;
  const uptrend = sma200 > sma200prev;

  if (pos > 0) {
    // In a trend ride: exit on 3x-ATR trailing stop below recent high or if the
    // golden-cross structure breaks.
    if (trendUp) {
      const hi = ctx.high(50, 1);
      if (hi == null) return null;
      const trailStop = hi - 3 * atr;
      if (price < trailStop || price < sma50 || sma50 < sma200) {
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // In an MR position: exit on snap-back above mid band or RSI up.
    if (price > ema20 || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter trend mode only on a confirmed strong sustained uptrend.
  if (trendUp) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  // Otherwise defensive MR entry: oversold flush below ATR-adaptive band in uptrend.
  if (uptrend && price < lowerBand && rsi < 40) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
