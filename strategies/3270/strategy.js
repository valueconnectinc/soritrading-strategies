/*
 * @coinsori-strategy v1
 * name: EMA Pullback Continuation
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend, short dips back to the fast 20-day mean
 * that quickly reclaim it tend to keep trending — we buy the dip earlier than a slow
 * mean-reclaim, and let winners run with a slow exit.
 * When it buys and sells: Buys when price closes back above the 20-day EMA after having
 * closed below it, while the 50-day EMA is above the 200-day EMA (uptrend regime).
 * Sells when price closes back below the 50-day EMA, or drops 3x ATR below entry
 * (hard stop).
 * When it does NOT work: In a choppy range the fast 20-day mean whipsaws and repeated
 * reclaim-buys lose to fees. In a falling market the regime filter keeps us out most
 * of the time. A violent V-shaped rally with no pullback gives us nothing to buy.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  // Closed-bar signals (ago>=1) so live and backtest agree.
  const e20_1 = ctx.ema(20, 1);   // fast mean, last closed bar
  const e20_2 = ctx.ema(20, 2);   // fast mean, two bars back
  const e50_1 = ctx.ema(50, 1);   // slow mean, regime check
  const e200_1 = ctx.ema(200, 1); // long-term regime gate
  const pc1 = ctx.closes.at(-2);  // last closed bar
  const pc2 = ctx.closes.at(-3);  // two bars back
  if (e20_1 == null || e20_2 == null || e50_1 == null || e200_1 == null || pc1 == null || pc2 == null) return null;

  if (pos === 0) {
    const uptrend = e50_1 > e200_1;      // medium-term trend must be up
    const dipped = pc2 < e20_2;          // price had closed below the fast mean
    const reclaimed = pc1 > e20_1;       // and now closed back above it
    ctx.watch([{ side: 'buy', price: e20_1, trigger: 'above', note: 'EMA20 reclaim' }]);
    if (uptrend && dipped && reclaimed) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // Exit: lost the medium-term trend, or hard stop.
  const atr = ctx.atr(14);
  if (atr == null) return null;
  const stopPx = ctx.entryPx - 3.0 * atr; // 3x ATR stop: extra room so the fast entry isn't stopped by noise
  ctx.watch([
    { side: 'sell', price: e50_1, trigger: 'below', note: 'EMA50 break' },
    { side: 'sell', price: stopPx, trigger: 'below', note: 'hard stop' }
  ]);
  if (pc1 < e50_1) return { side: 'sell', qty: pos };
  if (price <= stopPx) return { side: 'sell', qty: pos };
  return null;
}
