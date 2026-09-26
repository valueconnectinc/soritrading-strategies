/*
 * @coinsori-strategy v1
 * name: VWAP Reclaim Mean Reversion SOL 4H v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In strong uptrends SOL pulls back to its VWAP and then
 * reclaims it, resuming the move — a mean-reversion edge. The earlier ledger
 * version captured melt-ups well (+1357/+112/+74%, beats hold 2/3) but had
 * 63-88% MDD. My first re-attempt whipsawed (561 trades) and the EMA100
 * version was too strict (6 trades). This uses EMA(50) as the anchor with a
 * modest 0.5-ATR dip-then-reclaim to hit a moderate trade count.
 * When it buys and sells: in a 20>50 EMA uptrend, buys when price dips 0.5
 * ATR below the anchor then closes back above it; sells on a 2.5x-ATR stop,
 * overextension >2x ATR above the anchor, or uptrend break.
 * When it does NOT work: in a strong bear or deep chop the reclaim fires on
 * dead-cat bounces and the stop takes repeated small losses; MDD stays
 * elevated during long corrections.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const anchor = ctx.ema(50, 1); // VWAP proxy: 50-EMA as mean anchor
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || anchor == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const uptrend = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    if (price >= anchor + atr * 2) return { side: 'sell', qty: pos };
    if (!uptrend) return { side: 'sell', qty: pos };
    return null;
  }

  if (!uptrend) return null;

  const prevPrice = ctx.closes[ctx.closes.length - 2];
  if (prevPrice == null) return null;
  const dipped = prevPrice <= anchor - atr * 0.5;
  const reclaimed = price > anchor;
  if (!dipped || !reclaimed) return null;

  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);
  return { side: 'buy', qty: qty };
}
