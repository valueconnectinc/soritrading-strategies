/*
 * @coinsori-strategy v1
 * name: DOGE Regime-Switch MeanReversion+Trend 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure mean reversion (BB+RSI dip-buy) defends crashes
 * beautifully but sits in cash during bulls and misses the melt-up. Pure trend
 * following catches bulls but bleeds in chop/bear. This switches between the
 * two by regime: in an uptrend (price above the 200-SMA) it rides the trend;
 * in a downtrend/range it buys oversold dips at the lower Bollinger band. Each
 * mode uses the tool that fits its regime.
 * When it buys and sells: TREND MODE — buy on a close above the 200-SMA, hold
 * while above it, sell on a close below. MR MODE — buy when price touches the
 * lower Bollinger band with RSI oversold and price near the long mean (a dip,
 * not a collapse); sell back at the middle band / overbought / ATR stop.
 * When it does NOT work: at the exact regime boundary (price hovering right at
 * the 200-SMA) it can flip modes and whipsaw; in a violent crash the trend mode
 * is already flat and the MR mode can still catch a falling knife if the gate
 * is too loose.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;
  const trendUp = price > sma200;

  if (trendUp) {
    // TREND MODE: ride the uptrend, exit on a close back below the 200-SMA.
    if (pos <= 0) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    const closePrev = ctx.closes[ctx.closes.length - 2];
    if (closePrev != null && closePrev < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // MR MODE: price below the long mean — only buy oversold dips, not collapses.
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || atr == null) return null;

  if (pos <= 0) {
    // gate: only buy a dip inside an intact range, not a collapse far below the mean
    if (price < bb.lower && rsi < 35 && price > sma200 * 0.97) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit at the mean / overbought, or ATR-scaled stop
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx - 2.5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
