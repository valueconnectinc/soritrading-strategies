/*
 * @coinsori-strategy v1
 * name: BTC Vol-Targeted Hold Weekly 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily vol-targeted hold (ID 2194) proved it cuts BTC's
 * crash drawdowns dramatically (MDD ~37-44% vs BTC's typical 60%+), but it
 * rebalances almost every day -> ~4200 trades/window, heavy fee/slippage cost in
 * live. This version rebalances only once a week instead of every day, keeping
 * the same de-risking logic but cutting trade count ~7x.
 * When it buys and sells: hold BTC, and every 7 bars set the position so the
 * expected daily move (ATR) equals 2% of account value. Sell down in high-vol,
 * buy back in calm. Never fully flat.
 * When it does NOT work: weekly rebalancing lags a fast crash by up to a week
 * (de-risks later than daily), so a sudden cliff can still hurt; and like the
 * daily version it never beats buy-and-hold in a clean steady bull.
 */
function onUpdate(ctx) {
  // rebalance only every 7 bars (weekly cadence) to cut churn vs daily
  if (ctx.i % 7 !== 0) return null;

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
