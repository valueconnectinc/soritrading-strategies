/*
 * @coinsori-strategy v1
 * name: BTC Vol-Targeted Hold Asym 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily vol-targeted hold (ID 2194) proved it cuts BTC
 * crash drawdowns (MDD ~37-44% vs BTC's typical 60%+), but rebalances almost
 * every day (~4200 trades/window) because it re-levers back up every time vol
 * calms. This version makes rebalancing ASYMMETRIC: it de-risks immediately
 * when volatility spikes (fast sell), but re-levers back up only slowly (a
 * meaningful gap must open before buying). That keeps the crash protection
 * while cutting most of the churny buy-back trades.
 * When it buys and sells: hold BTC. Every day, if recent volatility (ATR) rose
 * so the target position is below current, sell down right away. Only buy back
 * when the target exceeds current by a wide margin. Never fully flat.
 * When it does NOT work: in a choppy calm market it may sit under-invested for
 * a while (slow to re-lever) so it lags a sudden clean bull; and it still never
 * beats buy-and-hold in a steady uptrend.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const targetValue = (0.02 * equity) / (atr / price);
  const targetQty = targetValue / price;
  const curQty = pos;

  const diff = targetQty - curQty;

  // de-risk: sell immediately whenever we are above target (vol spiked)
  if (diff < 0) {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
  // re-lever: only buy back when the gap is wide (>15% of current position)
  // so we do not churn on every small calm spell
  if (diff > 0.15 * curQty) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  }
  return null;
}
