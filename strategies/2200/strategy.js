/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target SMA100 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: sensitivity check on the SMA period for the trend-gated
 * vol-target. The base version uses SMA50; this uses SMA100 (slower trend gate)
 * to confirm the edge is not hypersensitive to the exact SMA length.
 * When it buys and sells: if price > SMA100, hold full position. If price <
 * SMA100, size so the daily ATR move is ~2% of account value. Rebalance daily.
 * When it does NOT work: a slower SMA reacts later to trend turns, so it can
 * stay fully invested longer into a developing downtrend (bigger drawdown).
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma = ctx.sma(100, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma;

  let targetQty;
  if (trendUp) {
    targetQty = equity / price;
  } else {
    const targetValue = (0.02 * equity) / (atr / price);
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
