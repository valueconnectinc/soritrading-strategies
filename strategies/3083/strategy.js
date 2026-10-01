/*
 * @coinsori-strategy v1
 * name: BTC 1D Trend-Gated Vol-Target (upbit)
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: Instead of timing entries, this stays invested during the
 * uptrend (capturing the melt-up) and scales exposure down as the trend weakens.
 * Above the 50-day average it is fully invested; below it, position is cut to a
 * volatility target so a real crash takes only a small daily loss; a crash beyond
 * 3 ATRs below the average triggers a full exit to cash. This captures the bull
 * leg while protecting against the bear.
 * When it buys and sells: Above SMA50 = fully invested. Below SMA50 but within an
 * ATR-scaled band = ATR vol-target (2% daily). Beyond the ATR-scaled crash band =
 * fully to cash. Re-enters as price recovers above SMA50.
 * When it does NOT work: In a choppy sideways market the SMA50 flip whipsaws and
 * bleeds on fees; a fast V-shaped recovery can sell near the bottom and miss the
 * bounce. It is long-only, so a sustained bear means sitting in cash (no upside).
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
  // ATR-scaled crash band: 3.0 ATRs below the SMA50. Normal dips (1-2 ATR) stay in
  // the vol-target regime; only a genuine crash (>3 ATR) triggers full exit.
  const crashStop = price < sma50 - 3.0 * atr;

  let targetQty;
  if (crashStop) {
    targetQty = 0; // real crash: exit fully
  } else if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
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
