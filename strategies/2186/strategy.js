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
 * breakout and exiting on a 10-bar low — rides those bursts. ATR-based risk
 * sizing keeps each trade's dollar risk roughly constant.
 * When it buys and sells: buy when price closes above the highest high of the
 * last 20 bars. Sell when price closes below the lowest low of the last 10
 * bars. Position size is set so each trade risks about the same dollars.
 * When it does NOT work: in a long sideways/choppy market the 20-bar breakout
 * fires repeatedly and each is a false signal, bleeding fees; it also whipsaws
 * at the top of a parabolic spike when the channel is wide.
 */
function onUpdate(ctx) {
  const n = ctx.closes.length;
  if (n < 25) return null;
  const closePrev = ctx.closes[n - 2];
  if (closePrev == null) return null;

  // Donchian: entry on a close above the high of the prior 20 bars (ending 2 bars
  // ago so it excludes the bar being compared); exit below the low of prior 10 bars.
  const entryHi = ctx.high(20, 2);
  const exitLo = ctx.low(10, 1);
  if (entryHi == null || exitLo == null) return null;

  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (atr == null || price == null || cash == null) return null;
    if (closePrev > entryHi) {
      // risk 1.5% of cash per trade; a 2xATR stop risks ~1.5% of cash
      const riskCash = cash * 0.015;
      const stopDist = atr * 2;
      const qty = Math.min(cash / price, riskCash / stopDist);
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
