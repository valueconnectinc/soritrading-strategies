/*
 * @coinsori-strategy v1
 * name: BTC 1D Baseline Hybrid (EMA20 exit both)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Baseline copy of the validated Crash-Buy + Trend-Ride Hybrid (2998)
 * used purely as a control arm in the same-window comparison against the Dual-Exit variant.
 * Inside a rising 200-day trend gate it takes a squeeze-breakout entry (price closes above
 * the 20-day high during a Bollinger squeeze) and a mean-reversion pullback (price closes
 * below the ATR-adaptive lower Keltner band with RSI < 40), and exits both on the tight
 * EMA20 break or a 200-day trend turn-down.
 * When it buys and sells: Buy on squeeze breakout or oversold pullback inside a rising
 * 200-day trend. Sell on a close back below the 20-day EMA or when the 200-day trend turns.
 * When it does NOT work: In a broad bear the rising-trend gate keeps it flat. A squeeze
 * that resolves down is missed (long-only). Tight EMA20 exit can cut bull winners short.
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
    if (price < ema20 || sma200 < sma200prev) {
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

  if (mrEntry || squeezeBreakout) {
    const equity = ctx.cash + ctx.uPnl;
    const qty = (Number.isFinite(equity) && equity > 0 ? equity : ctx.cash) / price;
    return { side: 'buy', qty: qty * 0.98 };
  }
  return null;
}
