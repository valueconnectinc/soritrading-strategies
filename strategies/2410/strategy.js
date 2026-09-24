/*
 * @coinsori-strategy v1
 * name: ETH Regime Trend Slope-Sized 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The slope-filtered champion (2410) fixed the chop/crash weakness
 * but its hard slope gate delayed re-entry and missed large bull runs (2021-24: only
 * +21% of a +213% move). This variant softens the gate: the 50-day-average slope no
 * longer blocks buying outright, it only sizes the position — full size when the
 * average is rising, 0.7 size when it is flat/falling. So we still enter above the
 * average in all regimes (recapturing bull upside), but risk slightly less when the
 * trend is not confirmed, which keeps chop drawdowns small.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized by how strongly the average is rising. Sell when price closes 1 ATR below the
 * average (ignore small chop), or drops 2.5 ATRs below it in a crash. Extra sizing
 * cut in high volatility and extreme fear.
 * When it does NOT work: In a long grinding bear where price bounces above the average
 * repeatedly but the average is falling, it still enters at reduced size and can bleed
 * small losses. It is long-only and does not profit from shorting bear markets.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 60) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma50Prev = ctx.sma(50, 11); // ~10 bars earlier, to gauge slope
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma50Prev == null || atr == null || px <= 0) return null;

  const trendUp = sma50 > sma50Prev; // the 50-day average is rising
  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 2.5 * atr; // bail out of deep crashes early

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

  // Slope as a mild sizing factor: 0.7 when the average is flat/falling.
  if (!trendUp) sizeMult *= 0.7;

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

  if (exitBelow || crashStop) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
