/*
 * @coinsori-strategy v1
 * name: ETH Daily Long-Short Trend 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: a long-only trend ride loses to buy-and-hold on ETH because
 * it sits in cash during every downtrend while hold keeps the coins. Going SHORT
 * during downtrends (below the 200-SMA) turns those flat periods into profit,
 * so the strategy can beat holding in both directions instead of just avoiding
 * the crash. This is the directional-both-ways extension of the daily trend core.
 * When it buys and sells: LONG on a close above the 200-SMA, SHORT on a close
 * below it; flips to the opposite side at each cross. Position size = risk/ATR
 * with a fixed risk cap so a single whipsaw cannot destroy the account.
 * When it does NOT work: in a long sideways market price crosses the trend line
 * repeatedly, flipping long/short and paying fees on every whipsaw; and shorting
 * a strong bull that dips only briefly below the SMA gives back gains.
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
  const atr = ctx.atr(14, 1);
  if (atr == null || atr <= 0) return null;

  // risk per trade: 5% of cash, capped at 20% so a whipsaw costs a bounded amount
  const risk = Math.min(0.05 * cash, 0.20 * cash);
  const qty = Math.min(risk / atr, (cash / price) * 0.98);

  const crossedUp = closePrev2 <= smaP && closePrev > sma;
  const crossedDown = closePrev2 >= smaP && closePrev < sma;

  if (crossedUp && pos <= 0) {
    // close a short (if any), then go long
    if (pos < 0) return [{ side: 'buy', qty: -pos }, { side: 'buy', qty: qty }];
    return { side: 'buy', qty: qty };
  }
  if (crossedDown && pos >= 0) {
    // close the long (if any), then open a short
    if (pos > 0) return [{ side: 'sell', qty: pos }, { side: 'sell', qty: qty }];
    return { side: 'sell', qty: qty };
  }
  return null;
}
