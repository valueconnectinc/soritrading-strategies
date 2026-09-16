/*
 * @coinsori-strategy v1
 * name: Bollinger Band + MACD Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines the mean reversion signal from Bollinger Bands with a trend confirmation from MACD to reduce false signals. The combination aims to catch trends while filtering out noise in sideways markets.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and the MACD is showing bullish momentum. It sells when the price touches the upper Bollinger Band and the MACD is showing bearish momentum.
 * When it does NOT work: It fails during strong trending periods, where the price continues to move in one direction without reverting, making the mean reversion signals ineffective.
 */

function onUpdate(ctx) {
  // --- Input Parameters ---
  const bbPeriod = 20;
  const bbMultiplier = 2.0;
  const macdFast = 12;
  const macdSlow = 26;
  const macdSignal = 9;

  // === Bollinger Band Calculation ===
  const bb = ctx.bb(bbPeriod, bbMultiplier);
  if (bb == null) return null;
  
  const bbUpper = bb.upper;
  const bbLower = bb.lower;
  const bbMiddle = bb.middle;

  // === MACD Calculation ===
  const macd = ctx.macd(macdFast, macdSlow, macdSignal, 1);
  const macdPrev = ctx.macd(macdFast, macdSlow, macdSignal, 2);
  
  if (macd == null || macdPrev == null) return null;
  
  // --- Signal Conditions ---
  const price = ctx.price;
  
  // Buy condition: Price touches lower BB and MACD is bullish
  const buyCondition = price <= bbLower && macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal;

  // Sell condition: Price touches upper BB and MACD is bearish
  const sellCondition = price >= bbUpper && macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal;
  
  // === Trade Execution ===
  if (buyCondition && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
