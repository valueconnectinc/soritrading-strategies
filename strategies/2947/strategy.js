/*
 * @coinsori-strategy v1
 * name: BTC 1D Bollinger-RSI Mean Reversion (Rising Trend)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In choppy and bear-inclined markets, sharp drops to extreme
 * oversold levels tend to bounce. Buying oversold dips and selling the rebound is a
 * mean-reversion bet that works when there is no clear trend. Requiring the 200-day
 * average to be rising filters out bear-market bounces that keep falling.
 * When it buys and sells: Buys when the close is below the lower Bollinger band, RSI is
 * oversold (<30), the price is above the 200-day average AND that average is rising.
 * Sells when price returns to the middle of the band or RSI turns overbought (>60).
 * When it does NOT work: In a straight-line crash it stays in cash (good) but in a
 * relentless melt-up it exits too early and misses most of the upside. It is a
 * counter-trend strategy that only profits from bounces within an uptrend.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const s200 = ctx.sma(200, 1);
  const s200prev = ctx.sma(200, 2);
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (s200 == null || s200prev == null || bb == null || rsi == null) return null;

  // Rising trend: 200-day average is climbing (filters out bear-market bounces).
  const rising = s200 > s200prev;

  if (ctx.position <= 0) {
    if (rising && px > s200 && px < bb.lower && rsi < 30) {
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    return null;
  }

  if (px > bb.mid || rsi > 60) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
