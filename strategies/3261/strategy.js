/*
 * @coinsori-strategy v1
 * name: EMA Trend-Follow BTC 4h
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC 4h trends are long-lived; riding the trend while filtering out
 * counter-trend noise with a 200-bar trend filter avoids the whipsaw that killed the breakout idea.
 * When it buys and sells: buys when EMA20 crosses above EMA50 while EMA50 is above EMA200 (uptrend);
 * sells when EMA20 crosses back below EMA50.
 * When it does NOT work: in a choppy sideways market the two EMAs cross repeatedly and it bleeds
 * small losses; it also misses sharp V-reversals because EMAs lag.
 */

function onUpdate(ctx) {
  const emaFast = ctx.ema(20, 1);
  const emaSlow = ctx.ema(50, 1);
  const emaPrevFast = ctx.ema(20, 2);
  const emaPrevSlow = ctx.ema(50, 2);
  const emaTrend = ctx.ema(200, 1);
  if (emaFast == null || emaSlow == null || emaTrend == null ||
      emaPrevFast == null || emaPrevSlow == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // exit when the fast EMA crosses below the slow EMA
  if (pos > 0) {
    if (emaFast < emaSlow) return { side: 'sell', qty: pos };
    return null;
  }

  // enter only in an uptrend (EMA50 above EMA200) and on a fresh crossover
  const crossedUp = emaPrevFast <= emaPrevSlow && emaFast > emaSlow;
  if (crossedUp && emaSlow > emaTrend) {
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    return { side: 'buy', qty };
  }
  return null;
}
