/*
 * @coinsori-strategy v1
 * name: EMA Trend-Follow ATR Stop BTC 4h
 * ex: binance
 * syms: BTC
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC 4h trends are long-lived, but a pure EMA-cross exit gives back the top of
 * every move. Adding an ATR trailing stop locks in gains while the EMA filter avoids choppy entries.
 * When it buys and sells: buys when EMA20 crosses above EMA50 in an uptrend (EMA50>EMA200); exits on
 * an ATR trailing stop (price falls 3x ATR below its peak) or when EMA20 crosses below EMA50.
 * When it does NOT work: in a sideways market the EMA filter lets in false entries and it bleeds
 * small losses; it also lags sharp V-reversals.
 */

function onUpdate(ctx) {
  const emaFast = ctx.ema(20, 1);
  const emaSlow = ctx.ema(50, 1);
  const emaPrevFast = ctx.ema(20, 2);
  const emaPrevSlow = ctx.ema(50, 2);
  const emaTrend = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (emaFast == null || emaSlow == null || emaTrend == null ||
      emaPrevFast == null || emaPrevSlow == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // exit on ATR trailing stop: price fell 3x ATR below the running peak
  if (pos > 0) {
    const peak = ctx.state.peak || price;
    const newPeak = Math.max(peak, price);
    ctx.state.peak = newPeak;
    const stop = newPeak - 3 * atr;
    // 3x ATR is a wide enough cushion to ride normal noise but tight enough to keep the top
    if (price < stop || emaFast < emaSlow) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // enter only in an uptrend and on a fresh crossover
  const crossedUp = emaPrevFast <= emaPrevSlow && emaFast > emaSlow;
  if (crossedUp && emaSlow > emaTrend) {
    ctx.state.peak = price;
    const qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) return null;
    return { side: 'buy', qty };
  }
  return null;
}
