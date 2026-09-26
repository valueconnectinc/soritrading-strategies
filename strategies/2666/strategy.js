/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed Momentum ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In crypto, a breakout that arrives on much higher than average
 * volume is real participation and tends to continue; a quiet breakout is often a
 * fake-out. We bet that momentum with a volume confirmation is worth riding.
 * When it buys and sells: It buys when price is above a long trend line, crosses up
 * through a short trend line, AND volume is at least 1.8x its 20-bar average. It
 * sells when price falls back below the short trend line or hits a 3-ATR trailing stop.
 * When it does NOT work: In a choppy sideways market many volume spikes are fake-outs
 * that reverse immediately, so it can whipsaw. It also sits out long flat periods with
 * no volume conviction.
 */
function onUpdate(ctx) {
  const emaFast = ctx.ema(20, 1);
  const emaSlow = ctx.ema(100, 1);
  const avgVol = ctx.avgVol(20);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;

  if (emaFast == null || emaSlow == null || avgVol == null || atr == null || vol == null) return null;
  if (avgVol <= 0) return null;

  // need previous bar's fast/prev-slow to detect the crossover on CLOSED bars
  const emaFastPrev = ctx.ema(20, 2);
  const emaSlowPrev = ctx.ema(100, 2);
  if (emaFastPrev == null || emaSlowPrev == null) return null;

  const price = ctx.price;
  const state = ctx.state || {};

  // ---- ENTRY: bullish cross of fast over slow, price above slow, volume confirms ----
  if (ctx.position <= 0) {
    const crossedUp = emaFastPrev <= emaSlowPrev && emaFast > emaSlow;
    const trendOk = emaSlow > emaSlowPrev;                 // slow EMA itself rising = healthy uptrend
    const volOk = vol >= 1.8 * avgVol;                     // volume must be ~2x normal to confirm conviction
    if (crossedUp && trendOk && volOk) {
      // size a bit less than full to leave room for fees; risk is managed by the trail
      const qty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty };
    }
    return null;
  }

  // ---- EXIT: trend break or trailing stop ----
  // trailing stop rides the trend; tighten to 3 ATR (a full 3x daily range is a real reversal)
  if (state.highest == null) state.highest = price;
  if (price > state.highest) state.highest = price;
  const trailStop = state.highest - 3 * atr;
  if (price < trailStop) {
    state.highest = null;
    return { side: 'sell', qty: ctx.position };
  }
  // trend-break exit: fast EMA crossing back below slow = momentum exhausted
  if (emaFast < emaSlow) {
    state.highest = null;
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
