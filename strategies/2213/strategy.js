/*
 * @coinsori-strategy v1
 * name: Crypto Basket Trend-Gated Vol-Target 1D
 * ex: binance
 * syms: SOLUSDT, ETHUSDT, BTCUSDT
 * interval: 1d
 * cash: 30000
 *
 * Why this strategy: every attempt to cut a single asset's drawdown by timing its
 * exposure has failed because the drawdown is inherent to that asset's volatility.
 * This runs the validated trend-gate recipe (SMA50 + ATR vol-target + crash-stop)
 * independently on a BASKET of SOL, ETH and BTC. They are correlated but not
 * perfectly, so when one crashes the others often hold — the combined drawdown
 * should be lower than any single asset while still capturing crypto upside.
 * When it buys and sells: per symbol, above its own SMA50 = fully invested in that
 * symbol; below SMA50 but within 3 ATRs = ATR vol-target (2% daily); beyond 3 ATRs
 * below SMA50 = that symbol fully to cash.
 * When it does NOT work: in a broad crypto-wide crash (all three fall together, e.g.
 * 2022) the basket offers no diversification and behaves like a single asset. It
 * also underperforms the single best asset in a lopsided bull (e.g. SOL-only 2021).
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;
  // ATR-scaled crash band: 3.0 ATRs below the SMA50 (same as the validated SOL
  // champion). Normal dips (1-2 ATR) stay in vol-target; only a real crash exits.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit this symbol fully
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested in this symbol
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
