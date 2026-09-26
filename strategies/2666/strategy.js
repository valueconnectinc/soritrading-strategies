/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Momentum ETH 4H v2
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A price breakout that arrives on clearly above-average volume
 * reflects real conviction and tends to continue; quiet breakouts are often fake-outs.
 * We ride momentum only when volume confirms it.
 * When it buys and sells: Buys when price is above a medium trend line, crosses up
 * through a short trend line, and volume is at least 1.4x its 20-bar average. Sells
 * when price drops back below the short trend line or hits a 2.5-ATR trailing stop.
 * When it does NOT work: In a choppy sideways market many volume spikes reverse
 * immediately (whipsaw). It also sits idle through long flat stretches with no volume.
 */
function onUpdate(ctx) {
  const emaFast = ctx.ema(20, 1);
  const emaSlow = ctx.ema(50, 1);
  const avgVol = ctx.avgVol(20);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;

  if (emaFast == null || emaSlow == null || avgVol == null || atr == null || vol == null) return null;
  if (avgVol <= 0) return null;

  const emaFastPrev = ctx.ema(20, 2);
  const emaSlowPrev = ctx.ema(50, 2);
  if (emaFastPrev == null || emaSlowPrev == null) return null;

  const price = ctx.price;
  const state = ctx.state || {};

  if (ctx.position <= 0) {
    const crossedUp = emaFastPrev <= emaSlowPrev && emaFast > emaSlow;
    const trendOk = emaSlow > emaSlowPrev;
    const volOk = vol >= 1.4 * avgVol;               // 1.4x: real participation but not so strict it never fires
    if (crossedUp && trendOk && volOk) {
      const qty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty };
    }
    return null;
  }

  // trailing stop: 2.5 ATR gives back a little but exits before a real reversal
  if (state.highest == null) state.highest = price;
  if (price > state.highest) state.highest = price;
  const trailStop = state.highest - 2.5 * atr;
  if (price < trailStop) {
    state.highest = null;
    return { side: 'sell', qty: ctx.position };
  }
  if (emaFast < emaSlow) {
    state.highest = null;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
