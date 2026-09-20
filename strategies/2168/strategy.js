/*
 * @coinsori-strategy v1
 * name: ETH Daily Equity-Scaled Trend Ride 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily 200-SMA trend ride cuts drawdown hard (31% vs
 * buy-and-hold's 75% on the recent window) but lags holding on raw return,
 * because a fixed $ risk never grows with the account. Scaling the risk base
 * to a percentage of current cash makes a bull that compounds the account buy
 * more coins on each re-entry, so it can catch more of the up-move while still
 * cutting the downside. This is an equity-compounding variant of the daily core.
 * When it buys and sells: long on a close above the 200-SMA, sell on a close
 * below it. Position size = risk/ATR, where risk = 2% of current cash plus a
 * trend-strength bonus, capped at 25% of cash.
 * When it does NOT work: in a long sideways market price pokes above and below
 * the trend line (repeated small losses), and compounding into a late false
 * breakout after a long run loses more than a flat-size version would.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      // trend strength = distance above the 200-SMA, in fraction
      const distPct = (closePrev - sma) / sma;
      // risk base = 2% of cash (compounds with the account) + distance bonus
      const baseRisk = 0.02 * cash + Math.min(Math.max(distPct * 20000, 0), 1200);
      // never risk more than 25% of cash in one trade
      const risk = Math.min(baseRisk, 0.25 * cash);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
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
