/*
 * @coinsori-strategy v1
 * name: Trend-Gated Vol-Target BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The strongest hold-beating family in the ledger is the
 * trend-gated vol-target champion, validated on BTC 1d. It rides up-trends
 * at a risk-managed size and cuts exposure when volatility spikes. This
 * tests whether my implementation reproduces the documented BTC champion.
 * When it buys and sells: stays long only while price is above the 50-day
 * average; sizes the position so a 3x-ATR adverse move costs ~2% of equity,
 * scaling up with trend strength. Exits when price drops below the 50-day
 * average or a 3x-ATR stop is hit.
 * When it does NOT work: in choppy sideways markets the 50-day gate whipsaws;
 * on memecoins with violent crashes (DOGE 2021-24) it loses.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  if (sma50 == null || atr == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0 && ctx.entryPx != null && price <= ctx.entryPx - atr * 3) {
    return { side: 'sell', qty: pos };
  }
  if (pos > 0 && price < sma50) {
    return { side: 'sell', qty: pos };
  }
  if (price <= sma50) return null;

  const strength = Math.min(1.5, Math.max(0.5, price / sma50 - 1.0 + 0.5));
  const equity = ctx.cash + pos * price;
  const riskPerCoin = atr * 3;
  const targetQty = (equity * 0.02 * strength) / riskPerCoin;

  if (pos > 0) {
    const diff = targetQty - pos;
    if (Math.abs(diff) > pos * 0.05) {
      return { side: diff > 0 ? 'buy' : 'sell', qty: Math.abs(diff) };
    }
    return null;
  }
  if (targetQty > 0) return { side: 'buy', qty: targetQty };
  return null;
}
