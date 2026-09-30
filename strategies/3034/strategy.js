/*
 * @coinsori-strategy v1
 * name: BTC 4h Volume-Surge Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ledger flagged a volume-surge breakout on BTC 4h as PROMISING
 * (+257/+68/+29%, beat buy-and-hold 2/3, MDD 22-44%) but it was never developed into a
 * champion. This is a genuinely different family from the validated 1d mean-reversion
 * champion — it rides momentum breakouts that MR structurally misses. Volume confirmation
 * separates real breakouts from noise, cutting drawdown vs a plain Donchian breakout.
 * When it buys and sells: Buy when price closes above the 20-bar high on volume at least
 * 1.5x the 20-bar average, and only inside a rising long-term trend (EMA200 rising) to
 * avoid bear-market breakdowns. Sell when price closes below the 20-bar low (trailing stop).
 * When it does NOT work: In a sideways chop the breakout+volume filter still whipsaws and
 * bleeds fees; it lags in slow grind-ups with no volume surges, and it is fully invested in
 * fast crashes so drawdown can be steep on a sudden reversal.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const high20 = ctx.high(20, 1);       // 20-bar high (closed bars)
  const low20 = ctx.low(20, 1);         // 20-bar low (closed bars)
  const avgVol = ctx.avgVol(20);
  const curVol = ctx.vol;
  const ema200 = ctx.ema(200, 1);
  const ema200prev = ctx.ema(200, 2);
  if (high20 == null || low20 == null || avgVol == null || avgVol <= 0 || curVol == null || ema200 == null || ema200prev == null) return null;

  if (pos > 0) {
    // Trailing exit: close below the 20-bar low ends the breakout ride.
    if (price < low20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Only buy breakouts inside a rising long-term trend (avoid bear breakdowns).
  if (!(ema200 > ema200prev)) return null;

  // Volume-confirmed breakout: close above 20-bar high on >=1.5x average volume.
  const volSurge = curVol >= 1.5 * avgVol;
  if (price > high20 && volSurge) {
    const qty = (ctx.cash / price) * 0.95;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
