/*
 * @coinsori-strategy v1
 * name: ETH Volatility-Scaled Trend 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The edge here is risk management, not timing. When volatility
 *   is high, a fixed-size position swings much more, so this strategy sizes each
 *   position by ATR: it buys more when volatility is calm and less when it is wild,
 *   so the dollar risk per trade stays roughly constant. This cuts deep drawdowns
 *   in crash regimes while still capturing calm uptrends.
 * When it buys and sells: Buy when the 50-period EMA is above the 200-period EMA
 *   (uptrend), sizing the position so the expected move (ATR) is a fixed fraction
 *   of the account. Sell when the uptrend breaks (fast EMA crosses below slow).
 * When it does NOT work: In choppy sideways markets the EMA whipsaws in and out.
 *   In a violent crash the trend exit lags and still takes a hit. Long-only, so it
 *   misses short-side gains in bears.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (fast == null || slow == null || atr == null || atr <= 0) return null;

  const pos = ctx.position;

  // Exit: uptrend broken.
  if (pos > 0) {
    if (fast < slow) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: uptrend, size the position by volatility so risk per trade is constant.
  if (fast > slow) {
    const RISK_FRAC = 0.02; // risk ~2% of account per trade
    const riskPerUnit = atr / ctx.price; // fractional move per ATR
    const qty = (ctx.cash * RISK_FRAC) / (ctx.price * riskPerUnit);
    return { side: 'buy', qty: Math.min(qty, (ctx.cash / ctx.price) * 0.98) };
  }

  return null;
}
