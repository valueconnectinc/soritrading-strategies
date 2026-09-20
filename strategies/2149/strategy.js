/*
 * @coinsori-strategy v1
 * name: ETH Trend Convex Risk Scaling 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the validated ETH 200-SMA trend ride (long above the SMA,
 * sell below it) has strong downside protection but under-deploys capital in
 * strong bull runs — a fixed-$ risk buys few coins when ATR is high, so it lags
 * buy-and-hold in mega-bulls. A previous attempt to simply raise the risk cap
 * failed because it over-risked at trend START (small distance above the SMA),
 * where whipsaws are common. This version uses CONVEX risk scaling: risk stays
 * small near the SMA (the chop zone) and only accelerates once the trend is
 * well-established far above it. Downside protection is preserved because risk
 * is still tiny exactly where false breakouts happen.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk / ATR, where risk = $300 + K * distance^2,
 * so it grows slowly at first and faster as the trend strengthens.
 * When it does NOT work: a deep, fast bear that recovers in one violent V
 * still whipsaws the SMA cross. And if a strong-looking bull fades just after
 * the big position is taken, this loses more than the flat-size version.
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
      // trend strength = how far price is above the 200-SMA, in fraction
      const distPct = (closePrev - sma) / sma;
      // CONVEX risk: quadratic in distance. Near SMA (dist~0) risk ~$300 and
      // stays low through the whipsaw zone; it accelerates only far above.
      // K=500k gives ~$350 at 1% above, ~$1550 at 5%, ~$2100 at 6% (capped).
      const risk = 300 + Math.min(Math.max(distPct * distPct * 500000, 0), 1900);
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
