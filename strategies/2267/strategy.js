/*
 * @coinsori-strategy v1
 * name: BTC Trend-Gated Vol-Target TrendScaled 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the trend-gated vol-target (SMA50 gate + ATR vol-target + ATR
 * crash stop) with trend-strength scaling is our most validated family — it cut
 * MDD from 60-85% to 30-54% while beating buy-and-hold on DOGE/SOL/BTC. This is
 * the clean champion (no fear-greed overlay, which was tested and rejected).
 * When it buys and sells: above SMA50 = fully invested; below SMA50 = position
 * scaled by closeness to SMA50; beyond the ATR crash band = cash.
 * When it does NOT work: violent bull corrections still give deep drawdowns, and a
 * fast V-shaped recovery can sell near the bottom.
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
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0;
  } else if (trendUp) {
    targetQty = equity / price;
  } else {
    const distFrac = 1 - (sma50 - price) / crashDist;
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
