/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target SoftCrash 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the crash-stop version (exit fully when price falls >12% below
 * the 50-day average) is validated but its known weakness is a V-shaped recovery —
 * it sells at the bottom and misses the bounce. Two separate re-entry fixes failed.
 * This takes a different approach: instead of going fully to cash in a crash, it
 * vol-targets to a TIGHT 1% daily move. We keep a small position through the crash,
 * so when price V-reverses we already hold some and ride the bounce naturally, with
 * no separate re-entry rule to get wrong.
 * When it buys and sells: price > SMA50 = full. price < SMA50 but within 12% = ATR
 * vol-target to 2% daily. price < SMA50*0.88 (deep crash) = ATR vol-target to a
 * tight 1% daily (small position, not zero).
 * When it does NOT work: in a slow grind down it churns between the two vol-target
 * levels; in a crash that keeps falling for many days the small position still
 * bleeds (though far less than full).
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
  // deep crash: below 12% of the 50-day average
  const inCrash = price < sma50 * 0.88;

  let targetQty;
  if (trendUp) {
    targetQty = equity / price; // uptrend: stay fully invested
  } else if (inCrash) {
    // deep crash: keep a SMALL position via tight 1% vol-target (not zero)
    const targetValue = (0.01 * equity) / (atr / price);
    targetQty = targetValue / price;
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
