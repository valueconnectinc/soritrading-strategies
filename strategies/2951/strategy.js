/*
 * @coinsori-strategy v1
 * name: BTC 1D Slow Momentum, ATR-Scaled
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's strongest, most durable rallies are slow adoption/accumulation
 * phases where price grinds higher over months. A slow 100-day momentum filter captures
 * only those sustained trends and ignores daily noise. Position size is scaled by
 * volatility (ATR) so a choppy stretch cannot wipe out the account the way all-in
 * breakout strategies do.
 * When it buys and sells: Buys when 100-day momentum is clearly positive (price well
 * above its 100-day-ago level) and adds a small position, scaling in as the trend
 * confirms. Sells when 100-day momentum turns negative (trend broken) or price breaks
 * below its 50-day low.
 * When it does NOT work: It is slow to enter and slow to exit, so it gives back part of
 * a reversal. It underperforms in long sideways chop where momentum hovers near zero and
 * the partial sizing keeps it under-invested. It is a trend strategy — it loses in
 * persistent bear markets just like buy-and-hold.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Slow momentum: price vs its level 100 days ago, as a percentage.
  const px100 = ctx.closes[ctx.closes.length - 1 - 100];
  if (!Number.isFinite(px100) || px100 <= 0) return null;
  const mom = price / px100 - 1;

  const atr = ctx.atr(14, 1);
  const lo50 = ctx.low(50, 1);
  if (atr == null || atr <= 0 || lo50 == null) return null;

  const pos = ctx.position;
  const st = ctx.state;

  if (pos > 0) {
    // Exit when the slow trend breaks (momentum turns negative) or price breaks
    // below its 50-day low. The 50-day low exit catches sharp reversals early.
    if (mom < -0.02 || price < lo50) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Buy only when 100-day momentum is clearly positive (8%+ = a real sustained
  // rally, not noise). Position sized so that 1.5% of equity is at risk per ATR,
  // capped at 95% of cash — partial sizing survives whipsaw.
  if (mom > 0.08) {
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.95;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
