/*
 * @coinsori-strategy v1
 * name: EMA Pullback Continuation
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In a confirmed uptrend, sharp pullbacks to the rising 50-day
 * average that then reclaim it tend to keep trending up — we buy the dip and ride,
 * staying invested through bull markets better than a pure breakout strategy.
 * When it buys and sells: Buys when price closes back above the 50-day EMA after
 * having closed below it, while the 50-day EMA is above the 200-day EMA (uptrend
 * regime). Sells when price closes back below the 50-day EMA, or drops 2x ATR below
 * entry (hard stop).
 * When it does NOT work: In a flat or choppy market the 50-day EMA whipsaws and
 * repeated dip-and-reclaims lose to fees. In a falling market the regime filter keeps
 * us out most of the time, but the few trades we do take can still fail. It lags a
 * violent V-shaped rally with no pullback to buy.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;

  // Closed-bar signals (ago>=1) so live and backtest agree.
  const f1 = ctx.ema(50, 1);    // 50-day mean, last closed bar
  const f2 = ctx.ema(50, 2);    // 50-day mean, two bars back
  const s1 = ctx.ema(200, 1);   // 200-day regime gate
  const pc1 = ctx.closes.at(-2); // last closed bar
  const pc2 = ctx.closes.at(-3); // two bars back
  if (f1 == null || f2 == null || s1 == null || pc1 == null || pc2 == null) return null;

  if (pos === 0) {
    const uptrend = f1 > s1;            // medium-term trend must be up
    const dipped = pc2 < f2;            // price had closed below the rising mean
    const reclaimed = pc1 > f1;         // and now closed back above it
    ctx.watch([{ side: 'buy', price: f1, trigger: 'above', note: 'EMA50 reclaim' }]);
    if (uptrend && dipped && reclaimed) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // Exit: lost the short-term trend, or hard stop.
  const atr = ctx.atr(14);
  if (atr == null) return null;
  const stopPx = ctx.entryPx - 2.0 * atr; // 2x ATR stop: wide enough for normal noise
  ctx.watch([
    { side: 'sell', price: f1, trigger: 'below', note: 'EMA50 break' },
    { side: 'sell', price: stopPx, trigger: 'below', note: 'hard stop' }
  ]);
  if (pc1 < f1) return { side: 'sell', qty: pos };
  if (price <= stopPx) return { side: 'sell', qty: pos };
  return null;
}
