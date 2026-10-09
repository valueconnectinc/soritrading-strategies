/*
 * @coinsori-strategy v1
 * name: ETH 4H Volatility Squeeze Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: volatility compresses into a tight range (squeeze) before large directional moves. Betting that a breakout from that squeeze starts a sustained trend.
 * When it buys and sells: buys when price closes above the upper Bollinger band while the bands are still narrow (low volatility), sells when price closes back below the middle band or the trend reverses.
 * When it does NOT work: in prolonged chop where every squeeze resolves into a false breakout — whipsaw losses. Also weak in slow grind-ups that never compress.
 */
function onUpdate(ctx) {
  // Use closed bars for signals so backtest == live
  const bb1 = ctx.bb(20, 2, 1);
  const bb2 = ctx.bb(20, 2, 2);
  const sma1 = ctx.sma(20, 1);
  const sma2 = ctx.sma(20, 2);
  if (bb1 == null || bb2 == null || sma1 == null || sma2 == null) return null;

  const c1 = ctx.closes[ctx.closes.length - 2];
  const c2 = ctx.closes[ctx.closes.length - 3];
  if (c1 == null || c2 == null) return null;

  // Band width measures how compressed volatility is (lower = tighter squeeze)
  const width1 = (bb1.upper - bb1.lower) / bb1.mid;
  const width2 = (bb2.upper - bb2.lower) / bb2.mid;

  // SQUEEZE: bands historically narrow (using a rolling percentile via simple threshold)
  // Threshold chosen: bottom ~30% of typical 4h band widths on ETH
  const SQUEEZE = 0.025; // band width below 2.5% of price = tight range

  // BUY: close breaks above upper band coming out of a squeeze, and price above SMA20 (trend up)
  if (ctx.position <= 0 && width2 < SQUEEZE && c1 > bb1.upper && c1 > sma1 && c2 <= bb2.upper) {
    ctx.watch([{ side:'sell', price: sma1, trigger:'below', note:'exit below mid' }]);
    return { side:'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL long: close falls back below the middle band (trend over)
  if (ctx.position > 0 && c1 < bb1.mid) {
    return { side:'sell', qty: ctx.position };
  }

  // SELL short: breakout down below lower band out of squeeze
  if (ctx.position <= 0 && width2 < SQUEEZE && c1 < bb1.lower && c1 < sma1 && c2 >= bb1.lower) {
    ctx.watch([{ side:'buy', price: sma1, trigger:'above', note:'exit above mid' }]);
    return { side:'sell', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Cover short: price back above middle band
  if (ctx.position < 0 && c1 > bb1.mid) {
    return { side:'buy', qty: -ctx.position };
  }

  return null;
}
