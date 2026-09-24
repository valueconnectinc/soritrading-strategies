/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend + Chandelier Exit 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated regime-trend recipe (SMA50 trend + vol-scaled
 * sizing + fear filter) is the most robust strategy found in this job. This variant
 * replaces the SMA-mean exit band with a CHANDELIER trailing stop (exit when price
 * drops 3 ATR from the highest high since entry) to protect gains in grind-downs
 * that never make a new high, while a rising trailing stop still lets melt-ups run.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized down when volatility is high or fear is extreme. Sell when price closes 3 ATR
 * below the highest high since entry, or 2.5 ATR below the 50-day average in a crash.
 * When it does NOT work: In straight-line melt-ups the trailing stop still exits on
 * pullbacks that immediately recover, so it underperforms buy-and-hold; and in slow
 * grind-downs the 3-ATR chandelier may still be too loose to fully protect the ride.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;

  // Volatility-scaled sizing: compare today's ATR/price to its 50-bar average.
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
  if (fg != null && fg <= 20) sizeMult *= 0.4;

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  // In position: track highest high since entry, exit on chandelier trailing stop.
  const st = ctx.state || {};
  const runHigh = Math.max(st.hi || 0, ctx.high(1));
  const chandExit = px < runHigh - 3.0 * atr; // 3 ATR below run-high = give up normal pullback, keep melt-up
  const crashStop = px < sma50 - 2.5 * atr; // backstop for deep crashes
  if (chandExit || crashStop) {
    return { side: 'sell', qty: pos };
  }
  ctx.state = { hi: runHigh };
  return null;
}
