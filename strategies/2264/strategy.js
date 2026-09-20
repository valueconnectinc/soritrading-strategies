/*
 * @coinsori-strategy v1
 * name: DOGE Trend-Gated Vol-Target CrashStop 1D
 * ex: binance
 * syms: DOGEUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the trend-gated vol-target (SMA50 gate + ATR vol-target + ATR
 * crash stop) is our most validated risk-managed family — it beats buy-and-hold on
 * BTC, ETH and SOL across all walk-forward windows, including bear markets. This
 * tests whether the same edge holds on DOGE, the most volatile major coin. It stays
 * fully invested in uptrends, scales down to a 2%-daily-vol target in mild pullbacks,
 * and exits fully only on a genuine crash (>3 ATR below SMA50).
 * When it buys and sells: above SMA50 = fully invested; below SMA50 but within an
 * ATR-scaled band = reduced ATR vol-target; beyond the ATR-scaled crash band = cash.
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
  // ATR-scaled crash band: 3.0 ATRs below the SMA50 — normal DOGE dips (1-2 ATR)
  // stay in the vol-target regime; only a genuine crash triggers the full exit.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // mild downtrend: vol-target
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
