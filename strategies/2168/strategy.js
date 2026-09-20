/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend Strength-Scaled 1D (conservative)
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily 200-SMA trend ride with trend-strength-scaled
 * risk beat the 4h champion on the recent window (higher return, half the
 * drawdown). Its only weakness is a high drawdown (75%) in the 2017-21
 * parabolic bull, caused by risking up to $1500 while holding through the
 * 2018 crash. This conservative variant caps the risk lower to reduce that
 * drawdown while keeping most of the recent-window edge.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position = risk/ATR, risk grows with distance above the SMA but
 * is capped at a smaller $900.
 * When it does NOT work: in a long sideways market price pokes above and
 * below the trend line (small losses), and it lags the exact top/bottom of
 * parabolic bulls.
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
      const risk = 300 + Math.min(Math.max(distPct * 12000, 0), 600); // cap at $900
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
