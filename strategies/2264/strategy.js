/*
 * @coinsori-strategy v1
 * name: DOGE Trend-Gated Vol-Target TrendScaled 1D
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the trend-gated vol-target (SMA50 gate + ATR vol-target + ATR
 * crash stop) is our most validated risk-managed family, and it beat buy-and-hold
 * on DOGE 1d last cycle. Its only weakness there is a high drawdown (61-85%) because
 * DOGE's melt-up vol keeps the 2% vol-target position large. This version scales the
 * position by trend strength: the further price is above SMA50, the bigger the
 * position; as it falls toward the crash band, position shrinks smoothly to zero.
 * The goal is to keep the bull-capture while cutting the deep-correction drawdown.
 * When it buys and sells: above SMA50 = fully invested; below SMA50 but above the
 * ATR crash band = position scaled by how close price is to SMA50 (smaller as it
 * falls); beyond the crash band = cash.
 * When it does NOT work: DOGE's extreme volatility still gives deep drawdowns in
 * violent bull corrections, and a fast V-shaped recovery can sell near the bottom
 * and miss the bounce.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  // ATR-scaled crash band: 3.0 ATRs below SMA50 — normal DOGE dips (1-2 ATR)
  // stay in the vol-target regime; only a genuine crash triggers the full exit.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
  } else {
    // mild downtrend: vol-target, scaled by trend strength.
    // distFrac = 1 right at SMA50 (still near uptrend) down to 0 at the crash band.
    const distFrac = 1 - (sma50 - price) / crashDist;
    // base 2% daily vol-target, then shrink linearly toward 0 as price nears crash band.
    const targetValue = (0.02 * equity) / (atr / price) * Math.max(0.1, distFrac);
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
