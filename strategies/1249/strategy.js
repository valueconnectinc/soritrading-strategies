/*
 * @coinsori-strategy v1
 * name: Supertrend + RSI Double Gate — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Supertrend (ATR-based) trend follower with RSI confirmation gate.
 * Entry when price crosses above the Supertrend lower band AND RSI(14) > 50
 * (avoids fake breakouts in overbought chop). Exit when price crosses back
 * below the Supertrend upper band.
 * Works in trending BTC. Fails in choppy/range-bound BTC where the trend
 * flips repeatedly and RSI oscillates around 50.
 */
function onUpdate(ctx) {
  const position = ctx.position;
  const price    = ctx.price;

  // ATR(10) — Supertrend uses this as volatility base
  const atr = ctx.atr(10);
  if (atr == null) return null;

  // RSI(14) — momentum gate
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // Manual Supertrend (factor 3):
  // hl2 = (high + low) / 2
  // upper = hl2 + 3 * ATR
  // lower = hl2 - 3 * ATR
  // Supertrend flips when price crosses the band.
  // We track state via ctx.state (persistent between bars).
  const high  = ctx.high(1, 0);
  const low   = ctx.low(1, 0);
  if (high == null || low == null) return null;

  const hl2    = (high + low) / 2;
  const upper  = hl2 + 3 * atr;
  const lower  = hl2 - 3 * atr;

  // Read previous bands from persistent state
  let prevUpper = ctx.state.prevUpper;
  let prevLower = ctx.state.prevLower;
  let prevST    = ctx.state.prevST;  // 1 = bullish, -1 = bearish

  // Initialise on first valid bar
  if (prevUpper == null) {
    prevUpper = upper;
    prevLower = lower;
    prevST    = 1;
    ctx.state.prevUpper = prevUpper;
    ctx.state.prevLower = prevLower;
    ctx.state.prevST    = prevST;
    return null;
  }

  // Final bands: tighten towards current band if trend continues
  const finalUpper = price > prevUpper ? Math.max(prevUpper, upper) : upper;
  const finalLower = price < prevLower ? Math.min(prevLower, lower) : lower;

  // Determine direction: flip when price crosses the opposite band
  let stDir = prevST;
  if (prevST === 1 && price < finalUpper) stDir = -1;
  if (prevST === -1 && price > finalLower) stDir = 1;

  // Save state for next bar
  ctx.state.prevUpper = finalUpper;
  ctx.state.prevLower = finalLower;
  ctx.state.prevST    = stDir;

  // === ENTRY ===
  if (!position) {
    // Price crosses above the lower band = bullish Supertrend
    const stBullish = stDir === 1;
    const rsiConfirm = rsi > 50;

    if (stBullish && rsiConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT ===
  if (position) {
    // Price crosses below the upper band = bearish Supertrend
    const stBearish = stDir === -1;

    if (stBearish) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
