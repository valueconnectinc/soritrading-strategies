/*
 * @coinsori-strategy v1
 * name: BTC 4H EMA-Stack Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The job's champion (regime hybrid) misses fast melt-ups
 * because its trend leg waits for a pullback to the 20-EMA — during a straight
 * melt-up there is no pullback, so it sits in cash. This is a DIFFERENT family:
 * pure momentum continuation that enters ON STRENGTH — when price is above a
 * rising 20-EMA which is above the 50-EMA (a full momentum stack). It rides the
 * trend until the stack breaks, capturing exactly the melt-ups the champion lags.
 * When it buys and sells: Buy when price > 20-EMA > 50-EMA AND the 20-EMA is
 * rising (momentum stack confirmed). Sell when price closes back below the 50-EMA
 * (stack broken) or on a 3x ATR hard stop. Position is ATR vol-targeted.
 * When it does NOT work: It buys extended tops late in a run and gives back gains
 * on sharp reversals before the 50-EMA exit. In choppy sideways markets the stack
 * whipsaws. It has no defensive contrarian leg, so it loses in bear markets.
 */
function onUpdate(ctx) {
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ema50) return { side: 'sell', qty: pos };
    return null;
  }

  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  // full momentum stack + rising 20-EMA = strong trend, enter on strength
  const stack = price > ema20 && ema20 > ema50 && ema20 > ema20p;
  if (stack) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
