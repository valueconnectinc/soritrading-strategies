/*
 * @coinsori-strategy v1
 * name: SOL Hybrid MR + Squeeze
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two proven ideas. (1) Mean reversion: buy deep
 * oversold dips at the bottom Bollinger band while above the long-term trend.
 * (2) Squeeze breakout: when volatility compresses (Bollinger band inside a
 * wider volatility band) and price breaks upward, that often starts a strong
 * move. Together they catch both panic rebounds and quiet breakouts.
 * When it buys and sells: Buys on an oversold dip at the lower band, OR on a
 * squeeze breakout above the 20-day high, both only while price is above the
 * 200-day average. Sells above the 20-day average or below the 200-day.
 * When it does NOT work: In a real bear market the trend gate keeps it in cash,
 * and a squeeze breakout in a topping market can be a false breakout that
 * reverses.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const r = ctx.rsi(14, 1);
  const ma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || r == null || ma200 == null || ema20 == null || atr == null) return null;

  const px = ctx.price;
  const prevClose = ctx.closes[ctx.closes.length - 2];
  const prevHigh = ctx.high(20, 2);
  if (prevClose == null || prevHigh == null) return null;

  // squeeze: Bollinger band is narrower than the 2.5x ATR volatility band
  const bbWidth = bb.upper - bb.lower;
  const keltnerWidth = 2.5 * atr;
  const squeeze = bbWidth < keltnerWidth;

  if (ctx.position === 0) {
    // only buy while above the long-term trend
    if (prevClose > ma200) {
      // entry 1: deep oversold dip at the bottom band
      if (prevClose <= bb.lower && r < 35) {
        return { side: 'buy', qty: ctx.cash / px * 0.98 };
      }
      // entry 2: squeeze breakout above the 20-day high
      if (squeeze && prevClose > prevHigh) {
        return { side: 'buy', qty: ctx.cash / px * 0.98 };
      }
    }
    return null;
  }

  // hard stop: below the 200-day average, get out fast
  if (prevClose < ma200) {
    return { side: 'sell', qty: ctx.position };
  }
  // normal exit: price recovered back above the 20-day average
  if (prevClose > ema20) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
