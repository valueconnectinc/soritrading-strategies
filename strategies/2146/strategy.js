/*
 * @coinsori-strategy v1
 * name: ETH Trend Strength-Scaled Size v3 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v1 (risk $300->$1500 by distance above the 200-SMA) is
 * consistent across windows but still under-deploys in strong bulls — a fixed
 * dollar risk buys few coins when ATR is high, so it lagged the 2019-22 bull
 * (+677% vs +1436% buy-hold). This v3 raises the max risk cap and steepens the
 * ramp so a strong, persistent trend deploys closer to full account, attacking
 * the bull-lag while keeping the base $300 risk for weak/whipsaw trends.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk / ATR, risk scales $300->$2500 with distance
 * above the SMA (capped at 98% of cash).
 * When it does NOT work: same whipsaw in sideways chop; the higher cap means a
 * strong-looking but false breakout loses more than the lower-cap version.
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
      // higher cap ($2500) and steeper ramp than v1's $1500 to deploy more in strong trends
      const risk = 300 + Math.min(Math.max(distPct * 40000, 0), 2200);
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
