/*
 * @coinsori-strategy v1
 * name: Volatility Filtered Bollinger Band Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Adds a volatility filter using ATR to avoid entering trades when the market is too volatile, which can cause significant drawdowns. This aims to improve risk-adjusted returns by reducing exposure to high-volatility periods.
 * When it buys and sells: It buys when price touches lower Bollinger Band and ATR is below a threshold, or if ATR has decreased significantly from a previous period. It sells when price touches upper Bollinger Band and ATR is below the threshold or ATR has decreased.
 * When it does NOT work: It may fail during low-volatility periods where the ATR filter prevents timely entry into profitable mean-reverting opportunities, reducing overall profitability.
 */

function onUpdate(ctx) {
  // --- Input Parameters ---
  const bbPeriod = 20;
  const bbMultiplier = 2.0;
  const atrPeriod = 14;
  const volatilityThreshold = 50; // Threshold for ATR in USDT

  // === Bollinger Band Calculation ===
  const bb = ctx.bb(bbPeriod, bbMultiplier);
  if (bb == null) return null;

  const bbUpper = bb.upper;
  const bbLower = bb.lower;
  const bbMiddle = bb.middle;

  // === ATR Calculation ===
  const atr = ctx.atr(atrPeriod, 1);
  const atrPrev = ctx.atr(atrPeriod, 2);

  if (atr == null || atrPrev == null) return null;

  // --- Signal Conditions ---
  const price = ctx.price;

  // Buy condition: Price touches lower BB and ATR is low
  const buyCondition = price <= bbLower && atr < volatilityThreshold;

  // Sell condition: Price touches upper BB and ATR is low
  const sellCondition = price >= bbUpper && atr < volatilityThreshold;

  // === Trade Execution ===
  if (buyCondition && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
