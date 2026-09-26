/*
 * @coinsori-strategy v1
 * name: VWAP Reclaim Mean Reversion SOL 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In strong uptrends SOL pulls back to its VWAP and then
 * reclaims it, resuming the move — a mean-reversion edge. The earlier ledger
 * version captured melt-ups well (+1357/+112/+74%, beats hold 2/3) but had
 * 63-88% MDD and my first re-attempt whipsawed with 500+ trades. This version
 * uses a SELECTIVE "dip-then-reclaim" entry (price dips below the anchor, then
 * closes back above it) to keep the trade count low and avoid chop, plus a
 * tight stop to control drawdown.
 * When it buys and sells: in a 20>50 EMA uptrend, buys when price dips at
 * least 1 ATR below the anchor then reclaims it (close back above); sells on
 * a 2.5x-ATR stop, when price overextends >2x ATR above the anchor, or when
 * the uptrend breaks.
 * When it does NOT work: in a strong bear or deep chop the reclaim fires on
 * dead-cat bounces and the stop takes repeated small losses; MDD stays
 * elevated during long corrections. Not a melt-up rider — it exits on
 * overextension so it lags the very top of a parabolic run.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const anchor = ctx.ema(100, 1); // VWAP proxy: longer EMA as mean anchor
  const atr = ctx.atr(14, 1);
  if (ema20 == null || ema50 == null || anchor == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const uptrend = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    // Hard stop: 2.5x ATR below entry — cuts losers before they run.
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    // Overextension exit: price >2x ATR above anchor = reversion done, take profit.
    if (price >= anchor + atr * 2) return { side: 'sell', qty: pos };
    // Uptrend broken: exit on the 50-EMA break.
    if (!uptrend) return { side: 'sell', qty: pos };
    return null;
  }

  if (!uptrend) return null;

  // Selective pullback structure: 1 bar ago price was at least 1 ATR BELOW
  // the anchor (a genuine dip), and this bar it closed back above the anchor
  // (reclaim = reversion confirmed). Reads closed bars (ago>=1) so it is
  // identical in backtest and live.
  const prevPrice = ctx.closes[ctx.closes.length - 2];
  if (prevPrice == null) return null;
  const dipped = prevPrice <= anchor - atr * 1;
  const reclaimed = price > anchor;
  if (!dipped || !reclaimed) return null;

  // Vol-targeted sizing: risk 1.5% of equity per ATR unit, cap at ~99% cash.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);
  return { side: 'buy', qty: qty };
}
