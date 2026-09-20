/*
 * @coinsori-strategy v1
 * name: ETH Trend-Momentum Deployment 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the validated ETH 200-SMA trend ride protects downside
 * well but lags buy-and-hold in mega-bulls. The cause is ATR-based sizing:
 * strong trends have high ATR, and dividing risk by ATR buys FEWER coins
 * exactly when the trend is strongest. This version keeps the 200-SMA long/
 * exit core but sizes the position as a cash FRACTION that grows with trend
 * strength (distance above the SMA) and momentum (rate of change over 20
 * bars). No ATR divisor, so a strong bull deploys more capital instead of less.
 * When it buys and sells: long on a close crossing above the 200-SMA, sell on
 * a close below it. Position = cash * (base + strength + momentum), capped.
 * When it does NOT work: in a choppy bear that the SMA filter lets through
 * late, aggressive sizing compounds losses faster than the flat-size version,
 * and a false breakout after a long run over-deploys into a reversal.
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
      // trend strength = how far price is above the 200-SMA (fraction)
      const strength = (closePrev - sma) / sma;
      // momentum = 20-bar rate of change (fraction), 0 if unknown
      const mom = ctx.change(20, 1);
      const momF = (mom == null) ? 0 : mom;
      // base deployment + strength bonus + momentum bonus, all in fraction of cash
      const deploy = 0.05 + Math.max(strength, 0) * 1.5 + Math.max(momF, 0) * 1.0;
      // cap at 50% of cash so a single whipsaw cannot wipe the account
      const frac = Math.min(deploy, 0.50);
      return { side: 'buy', qty: (cash / price) * frac };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
