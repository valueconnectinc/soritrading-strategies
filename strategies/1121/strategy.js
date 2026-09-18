/*
 * @coinsori-strategy v1
 * name: BTCUSDT 4H Squeeze Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buy when Bollinger Band width contracts below Keltner Channel bandwidth
 * (the "squeeze"), then price breaks out with volume surge. Hold 6 bars (~1 day).
 * Why: BTC alternates between tight consolidations and explosive moves.
 * The squeeze identifies low-volatility periods before big candles.
 * When it buys and sells: Enter on breakout above squeeze high + volume 1.8x avg.
 * Exit after 6 bars or if price drops 2x ATR from entry.
 * When it does NOT work: In strong sustained trends, the squeeze fires late
 * and the pullback stop gets hit. Works best in choppy/range-bound BTC.
 */

function onUpdate(ctx) {
  // Need 20 bars for BB, 20 for ATR (Keltner), 20 for volume
  const atr = ctx.atr(20);
  const vol20 = ctx.avgVol(20);
  if (atr == null || vol20 == null) return null;

  // Bollinger Bands: 20-period, 2 std dev
  const bb = ctx.bb(20, 2, 0);
  if (bb == null) return null;

  // Keltner Channel: 20-period EMA ± ATR*1.5
  const ema20 = ctx.ema(20);
  if (ema20 == null) return null;
  const kcUpper = ema20 + atr * 1.5;
  const kcLower = ema20 - atr * 1.5;

  // BB width = upper - lower
  const bbWidth = bb.upper - bb.lower;

  // Keltner channel width
  const kcWidth = kcUpper - kcLower;

  // Squeeze: BB width below Keltner width (tight bands inside Keltner)
  const isSqueeze = bbWidth < kcWidth;

  // Breakout: price above the highest high since squeeze started
  // Track the squeeze high in state
  if (!ctx.state.squeezeHigh) ctx.state.squeezeHigh = 0;
  if (isSqueeze) {
    const h = ctx.high(1); // previous closed bar high
    if (h != null && h > ctx.state.squeezeHigh) ctx.state.squeezeHigh = h;
  }

  const price = ctx.price;
  const vol = ctx.vol;
  if (vol == null) return null;

  // === ENTRY: breakout above squeeze high + volume confirmation ===
  if (price > ctx.state.squeezeHigh && vol > vol20 * 1.8) {
    const stopPx = price - atr * 2;
    ctx.state.entryBar = ctx.i;
    ctx.state.entryPx = price;
    ctx.state.squeezeHigh = 0; // reset after entry
    return {
      side: 'buy',
      qty: ctx.cash / price * 0.99,
      type: 'limit',
      price: price,
      trigger: { side: 'sell', qty: ctx.cash / price * 0.99, type: 'stop', price: stopPx }
    };
  }

  // === TIME EXIT: close after 6 bars ===
  if (ctx.position > 0) {
    if (ctx.state.entryBar == null) ctx.state.entryBar = ctx.i;
    const barsHeld = ctx.i - ctx.state.entryBar;
    if (barsHeld >= 6) {
      ctx.state.entryBar = null;
      ctx.state.entryPx = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  // === STOP EXIT: 2x ATR trailing stop ===
  if (ctx.position > 0 && ctx.state.entryPx) {
    const stopPx = ctx.state.entryPx - atr * 2;
    if (price < stopPx) {
      ctx.state.entryBar = null;
      ctx.state.entryPx = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
