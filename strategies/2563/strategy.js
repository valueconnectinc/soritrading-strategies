/*
 * @coinsori-strategy v1
 * name: VWAP Pullback Mean Reversion SOL 4H RiskControlled
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In strong uptrends SOL tends to pull back to its VWAP
 * (volume-weighted average price) and then resume — a mean-reversion edge.
 * The earlier ledger version captured melt-ups well (+1357/+112/+74%, beats
 * hold 2/3) but had 63-88% MDD. This version adds a tight stop and an
 * overextension exit to cut that drawdown without giving up the pullback edge.
 * When it buys and sells: buys when price pulls back near VWAP while the
 * 20>50 EMA uptrend is intact; sells when price reverts up to VWAP or on a
 * 2.5x-ATR stop, and exits early if price overextends (too far above VWAP).
 * When it does NOT work: in a strong bear (price under the 50-EMA) it should
 * stay flat — but if the uptrend filter is too loose it will catch falling
 * knives; sideways chop near VWAP whipsaws. MDD can still be high in a long
 * pullback that keeps re-triggering.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || atr == null) return null;

  // Approximate VWAP with a long EMA of price (typical stand-in when true
  // VWAP isn't exposed). EMA(50) of price acts as the mean price level.
  const price = ctx.price;
  const pos = ctx.position;
  const vwap = ctx.ema(50, 1); // re-read as the mean-reversion anchor
  if (vwap == null) return null;

  const uptrend = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    // Hard stop: 2.5x ATR below entry — cuts losers before they run.
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    // Overextension exit: if price runs >2x ATR above VWAP, take the reversion profit.
    if (price >= vwap + atr * 2) return { side: 'sell', qty: pos };
    // Uptrend broken: exit on the 50-EMA break.
    if (!uptrend) return { side: 'sell', qty: pos };
    return null;
  }

  // Only buy in a confirmed uptrend.
  if (!uptrend) return null;

  // Pullback entry: price within 0.5x ATR above VWAP (near the mean).
  const nearVwap = price <= vwap + atr * 0.5 && price >= vwap - atr * 0.5;
  if (!nearVwap) return null;

  // Vol-targeted sizing: risk 1.5% of equity per ATR unit, cap at ~99% cash.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);
  return { side: 'buy', qty: qty };
}
