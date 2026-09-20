/*
 * @coinsori-strategy v1
 * name: XRP Donchian Momentum Breakout 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: XRP moves in sharp trend bursts (breakouts) rather than
 * smooth trends, so a Donchian channel breakout — entering on a 20-bar high
 * breakout and exiting on a 5-bar low — rides those bursts while cutting
 * losers quickly. Fixed 60% position size (the sizing that validated best on
 * the BTC hashrate champion) keeps participation meaningful.
 * When it buys and sells: buy when price closes above the highest high of the
 * last 20 bars. Sell when price closes below the lowest low of the last 5
 * bars. Position size is 60% of cash.
 * When it does NOT work: in a long sideways/choppy market the 20-bar breakout
 * fires repeatedly and each is a false signal, bleeding fees; a parabolic
 * spike then a quick fade triggers the loose 5-bar exit at a loss.
 */
function onUpdate(ctx) {
  const n = ctx.closes.length;
  if (n < 25) return null;
  const closePrev = ctx.closes[n - 2];
  if (closePrev == null) return null;

  const entryHi = ctx.high(20, 2); // highest high of prior 20 bars, excluding compared bar
  const exitLo = ctx.low(5, 1);    // lowest low of prior 5 bars
  if (entryHi == null || exitLo == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (price == null || cash == null) return null;
    if (closePrev > entryHi) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    if (closePrev < exitLo) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
