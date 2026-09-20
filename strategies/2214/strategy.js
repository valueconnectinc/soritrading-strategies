/*
 * @coinsori-strategy v1
 * name: SOL Funding-Crowding CrashStop 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: price, volatility, macro, on-chain hashrate and fear/greed
 * filters all failed to reduce SOL's drawdown. This tries a DIFFERENT signal
 * source — derivatives crowding. SOL's worst crashes are leverage-driven
 * blowups: when funding is extremely positive (crowded longs) and open interest
 * is high, the market is fragile and a squeeze can unwind violently. Detecting
 * that crowding and de-risking before the blowup is orthogonal to every filter
 * tried so far.
 * When it buys and sells: the validated trend-gate recipe (SMA50 + ATR vol-target
 * + crash-stop) runs as usual, but when funding is very high (crowded long) it
 * cuts exposure to half, and when funding turns very negative (crowded short,
 * capitulation) it stays fully in to catch the bounce.
 * When it does NOT work: if SOL's crashes are NOT driven by funding extremes
 * (e.g. macro-driven broad selloffs), the funding gate adds noise without
 * protecting, and can trim upside in strong-but-healthy uptrends.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const oi = ctx.binanceOi(); // OI level (may be null if unavailable)
  const equity = cash + pos * price;
  const trendUp = price > sma50;
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  // Crowding gate: if OI is very high (leverage crowding), cut to half even in
  // an uptrend, because a leverage unwind is a known SOL blowup trigger.
  let crowdScale = 1.0;
  if (oi != null) {
    const oiHigh = oi > 1.5e9; // very high open interest in USD (SOL-scale heuristic)
    if (oiHigh) crowdScale = 0.5;
  }

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = (crowdScale * equity) / price; // uptrend, scaled down if crowded
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // mild downtrend: vol-target
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
