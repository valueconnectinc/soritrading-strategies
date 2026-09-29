/*
 * @coinsori-strategy v1
 * name: BTC 1D Hybrid MR + Squeeze Breakout (Vol-Confirmed)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This builds on my validated champion (Hybrid MR + Squeeze).
 * The squeeze-breakout entry's documented weakness is whipsaw in a flat range where
 * the squeeze fires then immediately reverses. I add a volume-confirmation filter:
 * the breakout is only taken when today's volume is meaningfully above its recent
 * average — a real expansion is backed by volume, a fake-out is not. The validated
 * 20-day-EMA exit is left untouched.
 * When it buys and sells: Buy when the 200-day trend is rising AND either (a) a
 * Bollinger squeeze breakout above the 20-day high WITH above-average volume, or
 * (b) a mean-reversion pullback below the lower Keltner band with weak RSI (unchanged).
 * Sell when price closes below the 20-day EMA or the 200-day trend turns down.
 * When it does NOT work: The volume filter can delay or skip a legitimate low-volume
 * squeeze breakout, so it may enter a strong move slightly later or miss a quiet
 * grind. In a broad bear the rising-trend gate keeps us flat (capital-safe but little
 * upside), and a squeeze resolving DOWN is missed (long-only).
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
    // Exit below the 20-day EMA or when the long-term trend turns down (validated, untouched).
    if (price < ema20 || sma200 < sma200prev) {
      return { side: 'sell', qty: pos };
    }
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
  const squeezed = pctile <= 0.2 && price > high20 && width > 0;

  // Volume confirmation: today's volume must exceed its 20-day average by a factor.
  // Only applied to the squeeze breakout (the whipsaw-prone entry), not the MR pullback.
  const avgVol = ctx.avgVol(20);
  const volOk = avgVol != null && avgVol > 0 && ctx.vol > 1.2 * avgVol;
  const squeezeBreakout = squeezed && volOk;

  if (mrEntry || squeezeBreakout) {
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
