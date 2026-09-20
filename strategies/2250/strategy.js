/*
 * @coinsori-strategy v1
 * name: ETH SMA200 Trend + ATR Trailing Stop 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the validated 200-SMA trend ride protects downside but
 * exits LATE in sharp crashes (price must fall all the way below the SMA).
 * An ATR trailing stop exits when price falls a fixed ATR multiple from its
 * running peak — a different mechanism than the rejected fast-SMA exit, and
 * wide enough (3x ATR) to avoid the whipsaw that killed that variant.
 * When it buys and sells: long on a close above the 200-SMA; exit either when
 * price closes below the 200-SMA OR when it falls 3x ATR below the running
 * peak since entry (whichever comes first).
 * When it does NOT work: in a slow grinding bear the trailing stop can exit
 * slightly before the SMA would, and in a choppy bull a 3x ATR stop still
 * whipsaws out on sharp pullbacks even though the SMA would have held.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      const baseRisk = 0.02 * cash + Math.min(Math.max(distPct * 20000, 0), 1200);
      const risk = Math.min(baseRisk, 0.25 * cash);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // track the running peak since entry using persistent state
    const peak = ctx.state.peak != null ? ctx.state.peak : closePrev;
    const newPeak = Math.max(peak, closePrev);
    ctx.state.peak = newPeak;
    const atr = ctx.atr(14, 1);
    // trailing stop: 3x ATR below the running peak (wide enough to avoid whip)
    const trail = atr != null ? newPeak - 3 * atr : 0;
    if (closePrev < sma || (atr != null && closePrev < trail)) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
