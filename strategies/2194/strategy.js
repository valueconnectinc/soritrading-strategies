/*
 * @coinsori-strategy v1
 * name: BTC Vol-Targeted Hold 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: instead of trying to predict direction, this manages risk.
 * BTC's violent drawdowns cluster in high-volatility periods. By holding a
 * position sized inversely to recent volatility (smaller when wild, larger when
 * calm), the equity curve is smoothed and crash drawdowns are cut, while still
 * participating in the long-term uptrend. No market timing, no regime filter.
 * When it buys and sells: always hold BTC, but each day set the position so the
 * expected daily move (ATR) is a constant fraction of cash. Sell down when ATR
 * spikes, buy back when it calms. Never fully flat.
 * When it does NOT work: it never beats buy-and-hold in a clean steady bull
 * (it is always partly in cash on average), and it still falls in a crash
 * (just less); it is a risk-reducer, not a return-maximizer.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || price == null || price <= 0) return null;

  // target: daily ATR move should be ~2% of total account value
  // so target position value = 0.02 * (cash + pos*price) / (atr/price)
  const equity = cash + pos * price;
  const targetValue = (0.02 * equity) / (atr / price);
  const targetQty = targetValue / price;
  const curQty = pos;

  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * curQty) return null;
  if (diff > 0) {
    // buy the shortfall, but never exceed ~98% of cash value
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
