/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid Dual-Exit + Hard Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated Dual-Exit (3012) beat the baseline hybrid on all
 * three disjoint BTC 1D windows, but its weakest period (2024-26) showed +13%/MDD33 —
 * the trend-ride exit (50-day EMA) gives back too much in a sharp crash before selling.
 * This version keeps the proven dual exit but adds a hard ATR-based protective stop on
 * trend entries so a sudden crash is cut before the slow EMA50 exit triggers.
 * When it buys and sells: Same two entries inside a rising 200-day trend — a Bollinger
 * squeeze breakout above the 20-day high, and an ATR-Keltner oversold pullback. MR
 * trades exit on the EMA20/RSI55 snap-back; trend trades exit on a 50-day EMA break, a
 * 200-day trend turn-down, OR a hard 3.5*ATR stop below entry (whichever first).
 * When it does NOT work: In a broad bear the rising-trend gate keeps it flat. A squeeze
 * that resolves down is missed (long-only). The hard stop can be tripped by a normal
 * volatile shakeout before the trend resumes, costing a small loss that the slow exit
 * would have ridden through.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const high20 = ctx.high(20, 1);
  const bb = ctx.bb(20, 2, 1);
  if (ema20 == null || ema50 == null || atr == null || rsi == null || sma200 == null ||
      sma200prev == null || high20 == null || bb == null || bb.upper == null ||
      bb.lower == null || atr <= 0) return null;

  const pos = ctx.position;
  const entryType = ctx.state.entryType || 0;

  if (pos > 0) {
    const entryPx = ctx.entryPx && ctx.entryPx > 0 ? ctx.entryPx : price;
    // Hard stop on trend entries: 3.5*ATR below entry caps crash drawdown before the
    // slow EMA50 exit triggers (the 2024-26 MDD33 weakness). MR entries keep no hard
    // stop — their snap-back exit is already fast and tight.
    const hardStop = entryType === 1 && (entryPx - price) > 3.5 * atr;
    const trendExit = entryType === 1 && (price < ema50 || sma200 < sma200prev);
    const mrExit = entryType === 2 && (price > ema20 || rsi > 55);
    if (hardStop || trendExit || mrExit) {
      ctx.state.entryType = 0;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const uptrend = sma200 > sma200prev;
  if (!uptrend) return null;

  const lowerBand = ema20 - 2.5 * atr;
  const mrEntry = price < lowerBand && rsi < 40;

  const width = (bb.upper - bb.lower) / ((bb.upper + bb.lower) / 2);
  let pctile = 0.5;
  const lookback = 100;
  if (ctx.i >= lookback) {
    let countBelow = 0;
    let total = 0;
    for (let k = 1; k <= lookback; k++) {
      const b = ctx.bb(20, 2, k);
      if (b == null || b.upper == null || b.lower == null) continue;
      const w = (b.upper - b.lower) / ((b.upper + b.lower) / 2);
      total++;
      if (w > width) countBelow++;
    }
    if (total > 0) pctile = countBelow / total;
  }
  const squeezeBreakout = pctile <= 0.2 && price > high20 && width > 0;

  if (squeezeBreakout) {
    ctx.state.entryType = 1;
    const qty = (ctx.cash / price) * 0.98;
    return { side: 'buy', qty: qty };
  }
  if (mrEntry) {
    ctx.state.entryType = 2;
    const qty = (ctx.cash / price) * 0.98;
    return { side: 'buy', qty: qty };
  }
  return null;
}
