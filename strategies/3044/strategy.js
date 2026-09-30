/*
 * @coinsori-strategy v1
 * name: BTC 1D Volatility-Scaled Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin trends strongly but with wildly varying volatility.
 * A fixed position size risks too much in calm times and too little in wild times.
 * This strategy sizes each position so a fixed dollar amount is at risk per unit of
 * ATR (average true range), keeping risk roughly constant, and rides the trend with
 * a slow EMA as the exit. This is a risk-management + trend family (price-only).
 * When it buys and sells: Buy when price is above its 50-day EMA and that EMA is
 * rising (established uptrend). Position size = fixed risk budget divided by ATR,
 * so risk per trade is constant. Sell when price closes below the 50-day EMA
 * (trend broken) — a slow, decisive exit.
 * When it does NOT work: In a choppy sideways market the 50-day EMA whipsaws and we
 * churn. It is always in the market (no cash-out regime), so it fully rides
 * drawdowns in a bear market rather than stepping aside. Volatility scaling caps but
 * does not remove drawdown.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema50 = ctx.ema(50, 1);
  const ema50prev = ctx.ema(50, 2);
  const atr = ctx.atr(14, 1);
  if (ema50 == null || ema50prev == null || atr == null || atr <= 0) return null;

  const uptrend = ema50 > ema50prev;   // 50-day EMA rising = established uptrend

  if (pos > 0) {
    // Exit when price breaks below the 50-day EMA (trend lost).
    if (price < ema50) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (uptrend && price > ema50) {
    // Size so a 2x-ATR adverse move costs ~3% of cash (constant risk per trade).
    const riskBudget = ctx.cash * 0.03;
    const stopDist = 2 * atr;
    const qty = riskBudget / stopDist;
    return { side: 'buy', qty: qty };
  }
  return null;
}
