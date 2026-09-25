/*
 * @coinsori-strategy v1
 * name: DOT 1D Regime-Switch Hybrid
 * ex: binance
 * syms: DOTUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion recipe wins flat/down markets
 *   but badly lags strong bull runs (it sits in cash waiting for dips that never
 *   come). This hybrid adds a trend mode: when a strong uptrend is confirmed it
 *   rides the trend instead of mean-reverting, so it participates in melt-ups
 *   instead of missing them.
 * When it buys and sells: In a confirmed uptrend (close>SMA50 and SMA50>SMA200)
 *   it buys any pullback and holds with an ATR trailing stop. Otherwise it uses
 *   the band-bounce recipe (buy deep oversold dip below lower BB with RSI<30,
 *   exit on recovery to SMA20 / RSI>55, 6% hard stop).
 * When it does NOT work: Choppy whipsaw where the trend flips on/off frequently
 *   (mode-switch churn), and sharp bear-market crashes where even the trailing
 *   stop gives back gains. Trend mode is long-only, so it still loses in a
 *   sustained bear regardless of the band-bounce floor.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma20 = ctx.sma(20, 1);
  const atr = ctx.atr(14, 1);
  if (sma50 == null || sma200 == null || bb == null || bb.lower == null ||
      rsi == null || sma20 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const uptrend = price > sma50 && sma50 > sma200;

  if (pos > 0) {
    // hard stop always applies
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (uptrend) {
      // trend mode: trail with 3x ATR below the high-water mark
      const trail = ctx.high(1) - 3 * atr;
      if (price < trail) return { side: 'sell', qty: pos };
      return null;
    }
    // mean-reversion exit: recovered to SMA20 or RSI healthy
    if (rsi > 55 || price > sma20) return { side: 'sell', qty: pos };
    return null;
  }

  if (uptrend) {
    // trend mode: buy any pullback toward the 50-SMA, ride the trend
    if (price <= sma50 * 1.02) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }
    return null;
  }

  // mean-reversion mode: deep oversold dip below the lower band
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
