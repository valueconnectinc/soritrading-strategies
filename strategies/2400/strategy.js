/*
 * @coinsori-strategy v1
 * name: ETH Trend-Break Hold 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion regime-trend recipe's biggest weakness is the
 * 2021-2022 window where it whipsaws out on shallow pullbacks (1 ATR below the
 * average) and misses the bull. This version holds through pullbacks while the
 * 50-day average is still RISING, and only exits when the trend actually breaks
 * (price below the average AND the average itself turns down). The bet: in crypto
 * uptrends, price routinely dips below its average mid-rally without ending the
 * trend, so exiting on the dip forfeits the recovery leg.
 * When it buys and sells: Buy when price is above the 50-day average (sized down
 * in high volatility / extreme fear). Sell only when price closes below the
 * 50-day average AND the average is falling (trend confirmed broken), or on a
 * deep crash stop (price 3 ATR below the average). In a strong uptrend (price
 * well above the 200-day average) hold even through deeper pullbacks.
 * When it does NOT work: In slow grinding downtrends where the average slowly
 * erodes, it may hold too long and ride drawdowns before the trend-break exit
 * triggers (MDD can be large). It is long-only, so it does not profit from
 * shorting bear markets, and it can give back profits in a topping range before
 * the average rolls over.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 220) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const sma50prev = ctx.sma(50, 2);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || sma50prev == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  // Trend is broken only when price is below the average AND the average is falling.
  const trendBreak = px < sma50 && sma50 < sma50prev;
  const crashStop = px < sma50 - 3.0 * atr; // deep crash bail-out

  // Strong uptrend: price far above the 200-day average → hold through pullbacks.
  let strongTrend = false;
  if (sma200 != null && sma200 > 0) {
    strongTrend = px > sma200 * 1.25;
  }

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
  if (fg != null && fg <= 20) {
    sizeMult *= 0.4;
  }

  if (pos === 0) {
    if (long && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  // In a strong uptrend, ignore trendBreak and only exit on a deep crash.
  const shouldExit = strongTrend ? crashStop : (trendBreak || crashStop);
  if (shouldExit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
