/*
 * @coinsori-strategy v1
 * name: SOL Trend-Gated Vol-Spike DeRisk 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the champion (2209) holds 100% in uptrends and had a 59%
 * drawdown in 2021-24 because it rode the whole bull into the crash. Vol-targeting
 * in ALL regimes (tested) cut MDD but destroyed returns. This version keeps 100%
 * in calm uptrends but de-risks ONLY when volatility spikes (ATR far above its own
 * 50-day average) — targeting exactly the crash-prone periods without trimming
 * normal bull runs.
 * When it buys and sells: above SMA50 with normal ATR = fully invested. Above
 * SMA50 but ATR spiked = trimmed to a 2% vol-target. Below SMA50 within ATR band =
 * vol-target. Beyond ATR crash band = fully to cash.
 * When it does NOT work: a volatility spike can mark the start of a strong new
 * leg up, in which case de-risking trims a winner prematurely. Deep drawdowns
 * still occur if the crash is fast enough to beat the spike-trigger.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const atrLong = ctx.atr(50, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || atrLong == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  // Volatility spike: short ATR more than 2.0x its own 50-day average. Chosen so
  // normal SOL vol (short ATR swings 1-2x the long) stays fully invested and only
  // an abnormal vol burst triggers the de-risk — this is what separates the
  // crash-prone regime from a calm bull run.
  const spike = atr > 2.0 * atrLong;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp && !spike) {
    targetQty = equity / price; // calm uptrend: fully invested
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // spike or downtrend: 2% vol-target
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
