/*
 * @coinsori-strategy v1
 * name: Donchian breakout + volume confirmation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Donchian breakouts capture sustained directional moves
 * when price clears a 20-bar high with above-average volume. Volume confirms
 * the move is institutional, not noise. ATR stop manages risk in volatile SOL.
 * When it buys and sells: Enters long when price breaks above 20-bar high
 * with volume > 1.3x 20-bar avg AND EMA50 rising. Exits on ATR trailing stop
 * or when price closes below 20-bar low.
 * When it does NOT work: Choppy, range-bound markets where breakouts fail
 * repeatedly — each failed breakout costs the position.
 */

function onUpdate(ctx) {
  // Warm-up guards
  const ema50   = ctx.ema(50);
  const ema50_1 = ctx.ema(50, 1);
  const ema50_2 = ctx.ema(50, 2);
  const atr     = ctx.atr(14);
  const avgVol  = ctx.avgVol(20);
  const vol     = ctx.vol;
  if (ema50 == null || ema50_1 == null || ema50_2 == null || atr == null || avgVol == null || vol == null) return null;

  // Donchian channels: 20-bar high and low
  const dcLen    = 20;
  const dcHigh_1 = ctx.high(dcLen, 1);   // highest high of closed prior bar's lookback
  const dcLow_1  = ctx.low(dcLen, 1);
  if (dcHigh_1 == null || dcLow_1 == null) return null;

  // Previous bar's close (bar ago=1)
  const prevClose = ctx.closes[1];
  if (prevClose == null) return null;

  // EMA50 rising = broad uptrend (filter out counter-trend entries)
  const emaRising   = ema50 > ema50_1;
  const emaRising_1 = ema50_1 > ema50_2;

  // Volume spike: current vol > 1.3x 20-bar average — institutional participation
  const volConfirm = vol > avgVol * 1.3;

  // === ENTRY: previous bar closed above prior 20-bar high, volume confirmed ===
  const breakout = prevClose > dcHigh_1 && volConfirm;

  if (!ctx.position) {
    // No position — look for long entry
    // Conditions: EMA50 rising (2 bars), ATR present, breakout confirmed
    if (emaRising && emaRising_1 && breakout) {
      return {
        side: 'buy',
        qty: ctx.cash / ctx.price * 0.99
      };
    }
  } else {
    // === EXIT ===
    // Exit 1: price closes below 20-bar low (channel breakdown)
    if (prevClose < dcLow_1) {
      return { side: 'sell', qty: ctx.position };
    }

    // Exit 2: ATR trailing stop — 2.5x ATR below highest price since entry
    const entryPx  = ctx.entryPx;
    const trailStop = ctx.price - 2.5 * atr;
    if (ctx.price < trailStop) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
