/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend Strength-Scaled 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: on the daily timeframe the 200-SMA trend ride produces
 * far fewer trades and much lower drawdown than on 4h (the daily smooths out
 * intraday whipsaw). Scaling risk by how far price is above the 200-SMA lets
 * it deploy more capital in strong sustained trends while staying small in
 * weak choppy ones. This is a lower-drawdown variant of the validated 4h core.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk/ATR, where risk grows with distance above the
 * SMA (capped at a fraction of cash).
 * When it does NOT work: in a long sideways market price repeatedly pokes
 * above and below the trend line, causing small losses; and it lags the exact
 * top and bottom of parabolic bull runs, giving back some at each turn.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
