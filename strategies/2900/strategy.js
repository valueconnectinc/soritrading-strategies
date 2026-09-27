/*
 * @coinsori-strategy v1
 * name: Long-Horizon Time-Series Momentum BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto has persistent multi-month trends. A slow 90-day
 * time-series momentum filter (price now vs price 90 bars ago) stays long
 * through the straight-line melt-ups that the mean-reversion and OBV champions
 * both sit flat through, and exits before deep bear regimes. Betting on trend
 * persistence at a long horizon, not on short-term crossovers.
 * When it buys and sells: buys when the 90-day return is positive AND price is
 * above the 200-day average; sells when the 90-day return turns negative.
 * Position is ATR-scaled so volatile regimes get smaller size.
 * When it does NOT work: in a long sideways chop where the 90-day return
 * oscillates around zero it can whipsaw, and it gives back part of a peak
 * before the 90-day window turns negative (the known lag of slow momentum).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || atr == null || atr <= 0) return null;

  const closes = ctx.closes;
  if (!closes || closes.length < 92) return null;

  // 90-day time-series momentum: price now vs price 90 bars ago (ago=1 for closed bars).
  const now = closes[closes.length - 1];
  const past = closes[closes.length - 1 - 90];
  if (!Number.isFinite(now) || !Number.isFinite(past) || past <= 0) return null;
  const roc90 = (now - past) / past;

  // ATR-scaled size: risk 1.5% of equity per trade, in coin units.
  const riskEq = 0.015 * ctx.cash;
  const qty = riskEq / atr;
  const maxQty = ctx.cash / price * 0.95;

  if (pos > 0) {
    // Exit when the 90-day momentum turns negative (trend broken).
    if (roc90 < 0) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter on positive long-horizon momentum above the 200-day average.
  if (roc90 > 0 && price > sma200) {
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
