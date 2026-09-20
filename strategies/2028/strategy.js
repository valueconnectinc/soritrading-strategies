/*
 * @coinsori-strategy v1
 * name: Supertrend ATR Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Supertrend is a volatility-adaptive trend-following tool. It uses ATR
 * to build upper/lower bands; when price closes above the previous bar's
 * lower band the trend flips bullish (buy), and when it closes below the
 * previous bar's upper band the trend flips bearish (sell). The bands
 * act as a built-in trailing stop.
 * When it buys and sells: Buy on bullish Supertrend flip; sell on bearish
 * flip or when price retraces 2× ATR from entry.
 * When it does NOT work: Choppy range-bound markets — price whipsaws across
 * the bands, giving many small losses. ATR multiplier too low = noise,
 * too high = missed entries.
 */

function onUpdate(ctx) {
  const period = 10;  // ATR lookback period
  const mult   = 3.0; // ATR multiplier — higher = fewer but stronger signals

  // ── Current bar ATR ──────────────────────────────────────────────────────────
  const atr = ctx.atr(period);
  const atr1 = ctx.atr(period, 1); // previous bar's ATR
  if (atr == null || atr1 == null) return null;

  // ── Previous bar OHLC (closed, stable) ─────────────────────────────────────
  const prevH = ctx.high(1);
  const prevL = ctx.low(1);
  const prevC = ctx.closes[1];
  if (prevH == null || prevL == null || prevC == null) return null;

  // ── Current bar OHLC ─────────────────────────────────────────────────────────
  const curH = ctx.high();
  const curL = ctx.low();

  // ── Previous bar's final Supertrend bands (stored from last call) ───────────
  const prevBarUpper = ctx.state.prevBarUpper;
  const prevBarLower = ctx.state.prevBarLower;

  // ── Previous bar's basic bands (using prev bar HLC + prev bar ATR) ──────────
  const prevBasicUpper = (prevH + prevL) / 2 + mult * atr1;
  const prevBasicLower = (prevH + prevL) / 2 - mult * atr1;

  // ── Previous bar's final bands (Supertrend continuation) ───────────────────
  // Use stored values if available; otherwise compute from previous bar's data
  const prevFinalUpper = (prevBarUpper !== undefined)
    ? prevBarUpper
    : ((prevBasicUpper < (ctx.state.priorUpper || prevBasicUpper) || prevC > (ctx.state.priorUpper || prevBasicUpper)) ? prevBasicUpper : (ctx.state.priorUpper || prevBasicUpper));
  const prevFinalLower = (prevBarLower !== undefined)
    ? prevBarLower
    : ((prevBasicLower > (ctx.state.priorLower || prevBasicLower) || prevC < (ctx.state.priorLower || prevBasicLower)) ? prevBasicLower : (ctx.state.priorLower || prevBasicLower));

  // ── Current bar's basic bands (using prev bar HLC + current ATR) ─────────────
  const curBasicUpper = (prevH + prevL) / 2 + mult * atr;
  const curBasicLower = (prevH + prevL) / 2 - mult * atr;

  // ── Current bar's final bands ────────────────────────────────────────────────
  const curFinalUpper = (curBasicUpper < prevFinalUpper || prevC > prevFinalUpper) ? curBasicUpper : prevFinalUpper;
  const curFinalLower = (curBasicLower > prevFinalLower || prevC < prevFinalLower) ? curBasicLower : prevFinalLower;

  // ── Save current bar's final bands for next bar to use as "previous" ─────────
  ctx.state.prevBarUpper = curFinalUpper;
  ctx.state.prevBarLower = curFinalLower;
  ctx.state.priorUpper   = curFinalUpper;
  ctx.state.priorLower   = curFinalLower;

  // ── Trend direction: prevClose vs PREVIOUS bar final bands ──────────────────
  // This is the CORRECT comparison for flip detection
  const trendUp   = prevC > prevFinalLower;  // prev close above prev lower band
  const trendDown = prevC < prevFinalUpper;  // prev close below prev upper band
  const prevTrendUp   = (ctx.state.trendUp   !== undefined) ? ctx.state.trendUp   : trendUp;
  const prevTrendDown = (ctx.state.trendDown !== undefined) ? ctx.state.trendDown : trendDown;

  ctx.state.trendUp   = trendUp;
  ctx.state.trendDown = trendDown;

  // ── Flip detection ───────────────────────────────────────────────────────────
  const bullFlip = trendUp  && !prevTrendUp;   // just crossed above lower band
  const bearFlip = trendDown && !prevTrendDown; // just crossed below upper band

  // ── Position state ───────────────────────────────────────────────────────────
  const pos = ctx.position;
  const px  = ctx.price;

  // ── Entry ────────────────────────────────────────────────────────────────────
  if (pos === 0) {
    if (bullFlip) {
      const qty = ctx.cash / px * 0.99;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit ─────────────────────────────────────────────────────────────────
  if (pos > 0) {
    if (bearFlip) {
      return { side: 'sell', qty: pos };
    }
    const entryPx = ctx.entryPx;
    if (entryPx != null && px < entryPx - 2 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // ── Short exit ───────────────────────────────────────────────────────────────
  if (pos < 0) {
    if (bullFlip) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    const entryPx = ctx.entryPx;
    if (entryPx != null && px > entryPx + 2 * atr) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    return null;
  }

  return null;
}
