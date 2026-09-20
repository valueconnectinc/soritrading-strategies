/*
 * @coinsori-strategy v1
 * name: ETH Trend Strength-Scaled Size v2 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v1 scaled risk with trend strength (price distance above
 * the 200-SMA) and lifted the old-bull return from +510% to +790%. This v2
 * uses a slightly more conservative scaling curve (lower max risk, gentler
 * slope) to keep most of that bull gain while risking a bit less when the
 * trend is only moderately strong — aiming to hold the bear-window protection
 * closer to the flat-size base.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk / ATR, risk grows with distance above the SMA
 * but is capped tighter than v1.
 * When it does NOT work: same whipsaw in sideways chop; any trend-scaling
 * version loses more than flat sizing on a strong-looking false breakout.
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
      // gentler curve: $300 base up to $900 max, slower ramp than v1's $1500
      const risk = 300 + Math.min(Math.max(distPct * 12000, 0), 600);
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
