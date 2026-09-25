/*
 * @coinsori-strategy v1
 * name: XRP 1D Passive-Bull + Band-Bounce Hybrid
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion recipe is a validated
 *   down-market defender but lags strong bull runs. The previous active
 *   trend-mode hybrid failed because pullback-buying + ATR trail churned on
 *   volatile alts. This version uses a PASSIVE bull regime: in a confirmed
 *   uptrend (close>SMA200 and SMA50>SMA200) we just stay long and ride it —
 *   no active timing, so no churn. Otherwise we do the band-bounce.
 * When it buys and sells: In a confirmed uptrend, buy and hold. In flat/down
 *   regimes, buy deep oversold dips below the lower Bollinger band (RSI<30)
 *   and sell on recovery (RSI>55 or price>SMA20) or a 6% stop.
 * When it does NOT work: The uptrend test is slow (needs SMA200), so it can
 *   miss the early explosive part of a rally and re-enter late; and in a
 *   choppy sideways market the regime flips can whipsaw. Mean reversion still
 *   lags fast melt-ups.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const pos = ctx.position;

  // Bull regime: close>SMA200 and SMA50>SMA200 -> passively stay long.
  if (sma50 != null && sma200 != null && price > sma200 && sma50 > sma200) {
    if (pos <= 0) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    return null;
  }

  // Not a bull regime -> band-bounce mean reversion.
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma20 = ctx.sma(20, 1);
  if (bb == null || bb.lower == null || rsi == null || sma20 == null) return null;

  if (pos > 0) {
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (rsi > 55 || price > sma20) return { side: 'sell', qty: pos };
    return null;
  }
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
