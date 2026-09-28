/*
 * @coinsori-strategy v1
 * name: BTC 1D Bollinger-RSI Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In choppy and bear-inclined markets, sharp drops to extreme
 * oversold levels tend to bounce. Buying oversold dips and selling the rebound is a
 * mean-reversion bet that works better than trend-following when there is no clear trend.
 * When it buys and sells: Buys when the price closes below the lower Bollinger band and
 * RSI is oversold (<30), but only while price is above its 200-day average (avoid
 * catching a falling knife in a deep bear). Sells when price returns to the middle of the
 * band or RSI turns overbought (>60).
 * When it does NOT work: In a straight-line crash it keeps buying dips that keep falling
 * (the 200-day gate limits but does not eliminate this). In a relentless melt-up it exits
 * too early and misses most of the upside. It is a counter-trend strategy.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const s200 = ctx.sma(200, 1);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (s200 == null || bb == null || rsi == null) return null;

  if (ctx.position <= 0) {
    // Mean-reversion entry: oversold + below lower band + still above 200-day trend.
    if (px > s200 && px < bb.lower && rsi < 30) {
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    return null;
  }

  // Exit on rebound: back to the mid-band or RSI overbought.
  if (px > bb.mid || rsi > 60) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
