/*
 * @coinsori-strategy v1
 * name: Band-Bounce Mean Reversion DOT 4H
 * ex: binance
 * syms: DOTUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The mean-reversion band-bounce family (buy panic dips to
 * the lower Bollinger band, exit on recovery to the average) is validated as a
 * defensive strategy on LTC, BNB, AVAX and now DOT at 4h. This version widens
 * the stop from 6% to 8% because DOT is a high-volatility altcoin where the
 * tight 6% stop exits valid dips prematurely (the 6% version lost money in the
 * choppy 2024-26 window).
 * When it buys and sells: buys when price closes below the lower Bollinger
 * (20,2) band AND RSI(14) < 30; sells when price recovers to the 20-bar SMA
 * or RSI rises above 50, or on an 8% stop loss.
 * When it does NOT work: in a strong persistent downtrend the dip keeps
 * falling (falling knives), and it lags strong melt-up rallies because it
 * only buys dips and exits early.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma20 = ctx.sma(20, 1);
  if (bb == null || rsi == null || sma20 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx * 0.92) return { side: 'sell', qty: pos }; // 8% stop for volatile DOT
    if (price >= sma20 || rsi > 50) return { side: 'sell', qty: pos };
    return null;
  }

  if (price < bb.lower && rsi < 30) {
    const qty = ctx.cash / price * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
