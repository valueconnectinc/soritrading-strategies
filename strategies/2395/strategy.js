/*
 * @coinsori-strategy v1
 * name: ETH Trend-Age Profit-Lock 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated regime-trend champion's known weakness is that it
 * exits on shallow pullbacks during straight-line melt-ups, giving back gains that
 * immediately recover. Instead of a fixed hysteresis band, this version PROGRESSIVELY
 * tightens the exit as the position ages and profits grow — a mechanism, not a
 * parameter tweak. Early positions keep a loose 1.5-ATR band (ignore chop); mature,
 * deeply-profitable positions lock gains with a much tighter band.
 * When it buys and sells: Buy when price closes above the 50-day average (vol-scaled
 * size). Sell when price closes below the average minus a band that shrinks from
 * 1.5 ATR (fresh position) down to 0.3 ATR (long-held, big-profit position).
 * When it does NOT work: In choppy ranges the tightening can still whipsaw, and in
 * grind-downs that never recover it still rides deep drawdowns. It may also give up
 * a melt-up's final leg if the band tightens too early.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2];
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const entryPx = ctx.entryPx;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;

  // Volatility-scaled sizing (kept from champion).
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

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  // Progressively tighten the exit as the position matures and profits grow.
  // Fresh: 1.5 ATR band (ignore chop). Mature & profitable: down to 0.3 ATR.
  let band = 1.5;
  if (entryPx != null && entryPx > 0) {
    const profitPct = (px - entryPx) / entryPx;
    const profitFactor = Math.max(0, Math.min(1, profitPct / 0.25)); // 0 at entry, 1 at +25%
    band = 1.5 - 1.2 * profitFactor; // 1.5 -> 0.3 as profit grows
  }
  const exitBelow = px < sma50 - band * atr;
  const crashStop = px < sma50 - 2.5 * atr;

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
