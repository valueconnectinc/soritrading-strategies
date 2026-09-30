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
 * separates real breakouts from noise. This revision adds a faster EMA20 exit to cut the
 * drawdown that made the first version lag buy-and-hold.
 * When it buys and sells: Buy when price closes above the 20-bar high on volume at least
 * 1.5x the 20-bar average, and only inside a rising long-term trend (EMA200 rising).
 * Sell when price closes below the 20-bar low OR drops below the 20-bar EMA (faster exit).
 * When it does NOT work: In a sideways chop the breakout+volume filter still whipsaws and
 * bleeds fees; it lags in slow grind-ups with no volume surges, and it is fully invested in
 * fast crashes so drawdown can be steep on a sudden reversal.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const high20 = ctx.high(20, 1);
  const low20 = ctx.low(20, 1);
  const avgVol = ctx.avgVol(20);
  const curVol = ctx.vol;
  const ema200 = ctx.ema(200, 1);
  const ema200prev = ctx.ema(200, 2);
  const ema20 = ctx.ema(20, 1);
  if (high20 == null || low20 == null || avgVol == null || avgVol <= 0 || curVol == null || ema200 == null || ema200prev == null || ema20 == null) return null;

  if (pos > 0) {
    // Faster exit: close below either the 20-bar low (trailing) or the 20-bar EMA (momentum loss).
    if (price < low20 || price < ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!(ema200 > ema200prev)) return null;

  const volSurge = curVol >= 1.5 * avgVol;
  if (price > high20 && volSurge) {
    const qty = (ctx.cash / price) * 0.95;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
