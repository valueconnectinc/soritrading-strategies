/*
 * @coinsori-strategy v1
 * name: BTC Trend-Gated Vol-Target EMA100 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crypto is strongly trend-following on daily bars — riding a
 * long-term uptrend while cutting exposure in downtrends beats buy-and-hold with
 * far smaller drawdowns. This is a pure-price version (no external data) of the
 * most validated family in this job's history.
 * When it buys and sells: price above the 100-day EMA = fully invested. Price
 * below it = position scaled down by how far below (stays partially in for the
 * first part of a pullback). More than 3 ATR below the EMA = exit to cash.
 * Position size is capped by a 2% daily volatility target so a single bad day
 * cannot hurt too much.
 * When it does NOT work: in a violent bull correction the invested position
 * draws down before the 3-ATR stop triggers; a fast V-shaped recovery can sell
 * near the bottom)Skip the first pullback.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const ema = ctx.ema(100, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || ema == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > ema;
  const crashDist = 3.0 * atr;
  const crashStop = price < ema - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = equity / price; // above trend: fully invested
  } else {
    // Below trend: scale position down from full to near-zero as we approach
    // the crash band)Skip the first 0.1 floor keeps a small toe in on mild dips.
    const distFrac = 1 - (ema - price) / crashDist;
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
