/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend HighWaterMark 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated regime-trend champion rides full drawdowns in
 * grind-downs that never make a new high, so it lost to buy-and-hold in the
 * 2021-2024 chop/crash window. This variant replaces the SMA50-relative exit with a
 * trailing stop measured from the highest close of the last 20 bars, so it locks in
 * gains as price falls instead of waiting for a close below the 50-day average.
 * When it buys and sells: Buy when the last closed price is above the 50-day average
 * (sized down in high vol / extreme fear). Sell when price closes 2.5 ATRs below the
 * highest close of the last 20 bars (trailing stop), or as a crash stop 3 ATRs below
 * the 50-day average.
 * When it does NOT work: In strong straight-line bull runs a pullback can breach the
 * trailing stop and exit, giving back melt-up gains; and it still cannot profit from
 * shorting bear markets (long-only).
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const peak = ctx.high(20, 1); // highest close of the last 20 closed bars
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || peak == null || px <= 0) return null;

  const long = px > sma50;
  const trailStop = px < peak - 2.5 * atr; // exit 2.5 ATR below the 20-bar high
  const crashStop = px < sma50 - 3.0 * atr; // deep crash bail-out

  // Volatility-scaled sizing (same as champion).
  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }

  const fg = ctx.data('fear_greed');
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (trailStop || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
