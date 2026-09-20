/*
 * @coinsori-strategy v1
 * name: BTC SMA200 Trend Ride 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the SMA200 trend-ride was validated as the strongest
 * approach on ETH 4h across 7 years (all walk-forward windows positive and
 * beating buy-and-hold, with crash protection). BTC is the largest and most
 * persistent-trending crypto, so the same robust logic should transfer.
 * When it buys and sells: long on a close crossing above the 200-SMA (plus a
 * 0.3x ATR deadband to avoid whipsaw at the cross); sell on a close crossing
 * below the 200-SMA minus 0.3x ATR.
 * When it does NOT work: in a long sideways chop the SMA whipsaws in and out
 * and fees eat the small moves; and the slow SMA exits late in sharp crashes.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  // 0.3x ATR deadband around the SMA to avoid whipsaw at the cross
  const band = atr != null ? 0.3 * atr : 0;

  if (pos <= 0) {
    if (closePrev2 <= smaP + band && closePrev > sma + band) {
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      // risk 2% of cash per trade, scaled so a 1x ATR move = that risk
      const risk = 0.02 * cash;
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    if (closePrev < sma - band) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
