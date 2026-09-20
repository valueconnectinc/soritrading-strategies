/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride ATR-Scaled 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH's biggest gains come from long sustained uptrends.
 * A very slow trend line (200-period) keeps us in during those runs and only
 * steps aside when the trend genuinely breaks, so we capture most of the move
 * and avoid the whipsaw of faster crossovers. Position size is scaled by
 * volatility (risk a fixed 2% of equity per trade), so we take smaller
 * positions when the market is wild and larger ones when it is calm.
 * When it buys and sells: long on a close above the 200-SMA; sell on a close
 * below it. Position = 2% of equity risked, divided by ATR(14).
 * When it does NOT work: in a long sideways market price repeatedly pokes
 * above and below the trend line, causing small losses; and it lags the exact
 * top/bottom, giving back a little at each turn.
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
      const riskQty = (0.02 * ctx.cash) / atr; // risk 2% of equity per trade
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
