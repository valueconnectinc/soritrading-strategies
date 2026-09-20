/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target BASE 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: baseline (no hysteresis) trend-gated vol-target for a fair
 * comparison against the hysteresis variant. Full position when price > SMA50,
 * ATR-2% vol-target when below. Used only as a control in the same windows.
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
