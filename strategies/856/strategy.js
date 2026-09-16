/*
 * @coinsori-strategy v1
 * name: Macro Regime Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: The strategy leverages macroeconomic indicators to determine market regimes (bullish, neutral, bearish) and adjusts trading behavior accordingly — buying during bullish periods and selling/avoiding during bearish periods.
 * When it buys and sells: It buys when the market regime is bullish, and sells or holds position when the regime is neutral or bearish. This aims to avoid losses during downturns.
 * When it does NOT work: The strategy may fail if macroeconomic signals are delayed or incorrect, leading to missed opportunities or trades at inopportune times. It also underperforms in very volatile markets where regime change signals are unclear.
 */

function onUpdate(ctx) {
  // Fetch macro indicators
  const dxy = ctx.macro('dxy');             // Dollar Index
  const gold = ctx.macro('gold');           // Gold price
  const ust10y = ctx.macro('ust10y');       // US 10Y Treasury Yield

  // Guard against null values from macro data
  if (dxy == null || gold == null || ust10y == null) return null;

  // Define regime conditions based on macro indicators
  let regime = 'neutral';  // Default to neutral regime

  // Bullish regime: DXY low, Gold stable or rising, US 10Y Yield decreasing
  if (dxy < 100 && gold >= 1800 && ust10y < 4.0) {
    regime = 'bullish';
  }
  // Bearish regime: DXY high, Gold falling, US 10Y Yield increasing
  else if (dxy > 105 && gold < 1700 && ust10y > 4.5) {
    regime = 'bearish';
  }

  // Log the current regime for monitoring
  ctx.log(`Current Market Regime: ${regime}`);

  // Trading logic based on market regime
  if (regime === 'bullish') {
    // Buy when the regime is bullish
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (regime === 'bearish') {
    // Sell to close position when regime is bearish
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;  // Do nothing if no open position
  }

  // For neutral regime, do nothing
  return null;
}
