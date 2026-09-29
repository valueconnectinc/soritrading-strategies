/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze (ATR trailing exit)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same validated hybrid as the champion (mean-reversion pullback +
 * squeeze breakout inside a rising 200-day trend gate). The change is the EXIT: instead of
 * selling the moment price closes under the 20-day EMA, we trail price with an ATR-based
 * stop (exit only if price falls more than X ATRs below the highest close since entry).
 * Goal: let winners run further in strong trends while still cutting losers — attacking the
 * champion's 25-29% drawdown without touching the entries that already work.
 * When it buys and sells: Buy on the same two signals (pullback below Keltner lower band +
 * RSI<40, or Bollinger squeeze + 20-day high break) only when the 200-day trend is rising.
 * Sell when price closes more than 3 ATRs below the running best close, or the 200-day trend
 * turns down.
 * When it does NOT work: In a flat tight range the trailing stop still whipsaws out of good
 * entries, and a slow grinding decline (price falling gradually, not 3 ATRs in one day) can
 * be held too long before the stop trips.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const high20 = ctx.high(20, 1);
  const bb = ctx.bb(20, 2, 1);
  if (ema20 == null || atr == null || rsi == null || sma200 == null || sma200prev == null ||
      high20 == null || bb == null || bb.upper == null || bb.lower == null || atr <= 0) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // Track the highest close since entry to trail from.
    const entryIdx = ctx.state.runHighIdx != null ? ctx.state.runHighIdx : ctx.i;
    let runHigh = ctx.state.runHigh != null ? ctx.state.runHigh : price;
    if (price > runHigh) runHigh = price;

    // Exit if price closes more than 3 ATRs below the running best, or the trend turns down.
    const trailStop = runHigh - 3.0 * atr;
    if (price < trailStop || sma200 < sma200prev) {
      ctx.state.runHigh = null;
      ctx.state.runHighIdx = null;
      return { side: 'sell', qty: pos };
    }
    ctx.state.runHigh = runHigh;
    ctx.state.runHighIdx = ctx.i;
    return null;
  }

  // Only trade inside a rising long-term trend (the shared defensive gate).
  const uptrend = sma200 > sma200prev;
  if (!uptrend) return null;

  // Mean-reversion pullback entry: price under the ATR-adaptive lower Keltner band + weak RSI.
  const lowerBand = ema20 - 2.5 * atr;
  const mrEntry = price < lowerBand && rsi < 40;

  // Squeeze-breakout entry: Bollinger width in quietest 20% of last 100 bars + 20-day high break.
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

  if (mrEntry || squeezeBreakout) {
    ctx.state.runHigh = price;
    ctx.state.runHighIdx = ctx.i;
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
