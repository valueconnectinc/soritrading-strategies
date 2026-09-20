/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated DoubleMA CrashStop 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the champion (2209) uses a single SMA50 trend gate and had a
 * 40% drawdown in the recent sideways/chop regime. This version adds a second gate:
 * require the SMA50 to sit above the SMA200 (a "golden" long-term structure) before
 * going fully invested. In a choppy bear where the 50-day is below the 200-day, it
 * holds only a small vol-targeted position, cutting drawdown.
 * When it buys and sells: price > SMA50 AND SMA50 > SMA200 = fully invested. Price >
 * SMA50 but SMA50 < SMA200 (early recovery) = vol-target. Below SMA50 = vol-target.
 * Beyond ATR crash band = fully to cash.
 * When it does NOT work: at the start of a new bull after a long bear, the SMA50
 * crosses above SMA200 late, so it misses the early explosive leg. In a strong
 * uptrend the single-gate champion is more aggressive and returns more.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const sma200 = ctx.sma(200, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || sma200 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const priceAbove50 = price > sma50;
  const golden = sma50 > sma200; // long-term uptrend structure
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (priceAbove50 && golden) {
    targetQty = equity / price; // strong uptrend: fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // weak/choppy regime: vol-target
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
