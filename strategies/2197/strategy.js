/*
 * @coinsori-strategy v1
 * name: ETH Vol-Targeted Hold 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the same volatility-targeting risk overlay that cut BTC's
 * crash drawdowns (MDD ~37-44% vs BTC's typical 60%+) applied to ETH, which is
 * even more volatile. By holding ETH but sizing the position inversely to recent
 * volatility (smaller when wild, larger when calm), the equity curve is smoothed
 * and crash drawdowns are cut while still riding the long-term uptrend.
 * When it buys and sells: always hold ETH, but each day set the position so the
 * expected daily move (ATR) equals 2% of account value. Sell down when ATR
 * spikes, buy back when it calms. Never fully flat.
 * When it does NOT work: it never beats buy-and-hold in a clean steady bull
 * (always partly in cash on average), and it still falls in a crash (just less).
 * Daily rebalancing creates high trade churn and fee cost.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || price == null || price <= 0) return null;

  // target: daily ATR move should be ~2% of total account value
  const equity = cash + pos * price;
  const targetValue = (0.02 * equity) / (atr / price);
  const targetQty = targetValue / price;
  const curQty = pos;

  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * curQty) return null;
  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
