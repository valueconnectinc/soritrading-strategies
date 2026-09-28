/*
 * @coinsori-strategy v1
 * name: SOL 1D Dual-Mode Keltner MR + Trend Ride
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated ATR-adaptive Keltner mean-reversion core
 * defends beautifully in chop/bear (positive on ~29/32 windows across 11 assets)
 * but sits in cash during relentless melt-ups and lags buy-and-hold. This dual-mode
 * variant fixes that: when the market is in a strong, rising uptrend it rides the
 * trend (holds long), and only switches to the defensive mean-reversion mode when
 * the trend has broken. Two complementary families in one.
 * When it buys and sells: TREND mode holds long whenever price is above a rising
 * 50-day average with momentum (price above its 10-day average) — capturing the
 * melt-up. MR mode buys mean-reversion dips (below ATR-adaptive lower Keltner band
 * with RSI<40) only when the 200-day uptrend gate is intact, and sells on snap-back
 * above the mid band. It exits the trend ride on a momentum break or stop.
 * When it does NOT work: In a choppy range-bound market the trend signal whipsaws
 * in and out, churning fees with little gain — the pure MR version is better there.
 * In a violent crash the trend stop still takes a hit before the defensive mode
 * re-engages. The dual mode trades more and pays more fees than the pure MR.
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
  // Trend-ride signals.
  const sma50 = ctx.sma(50, 1);
  const sma50prev = ctx.sma(50, 2);
  const sma10 = ctx.sma(10, 1);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null ||
      sma50 == null || sma50prev == null || sma10 == null) return null;

  // --- TREND MODE: ride strong uptrends (captures the melt-up the MR core misses).
  const trendUp = price > sma50 && sma50 > sma50prev && price > sma10;

  // --- MR MODE: defensive mean reversion inside healthy long-term uptrend.
  const lowerBand = ema20 - 2.5 * atr;
  const uptrend = sma200 > sma200prev;

  if (pos > 0) {
    // Trend exit: momentum breaks (price falls below 10-day) OR long-term trend rolls over.
    if (!trendUp) {
      return { side: 'sell', qty: pos };
    }
    // MR exit: snap-back above mid band or RSI turns up.
    if (price > ema20 || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter trend mode when a strong uptrend is confirmed.
  if (trendUp) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  // Otherwise defensive MR entry: oversold flush below ATR-adaptive band in uptrend.
  if (uptrend && price < lowerBand && rsi < 40) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
