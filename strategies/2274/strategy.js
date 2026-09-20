/*
 * @coinsori-strategy v1
 * name: BTC Trend-Gated Vol-Target SMA200 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the SMA50-gated vol-target champion transfers to 4h but churns
 * heavily (6600-7400 trades) with higher MDD than 1d. The 4h family's separately
 * robust gate was SMA200, so this tests whether a longer gate reduces churn and
 * drawdown while keeping the 4h alpha.
 * When it buys and sells: above SMA200 = fully invested; below = position scaled by
 * closeness to SMA200; beyond the ATR crash band = cash.
 * When it does NOT work: a slow gate re-enters late after a deep crash, missing part
 * of the recovery; violent bull corrections still give deep drawdowns.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma = ctx.sma(200, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma;
  const crashDist = 3.0 * atr;
  const crashStop = price < sma - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0;
  } else if (trendUp) {
    targetQty = equity / price;
  } else {
    const distFrac = 1 - (sma - price) / crashDist;
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
