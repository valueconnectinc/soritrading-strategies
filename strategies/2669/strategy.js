/*
 * @coinsori-strategy v1
 * name: Squeeze-Breakout LINK 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A volatility squeeze (Bollinger bands contracting to a
 * tight range) builds energy that often releases as a directional breakout.
 * Buying the first breakout above the upper band, confirmed by MACD, rides
 * that release. This is the exact recipe validated as a defensive strategy
 * on ETH/SOL/BTC 4H (fails BNB), transferred unchanged to LINK to test the
 * family's reach on a fresh high-volatility alt.
 * When it buys and sells: buys when the Bollinger(20,2) bandwidth is squeezed
 * (below its 50-bar average) and price breaks above the upper band with MACD
 * above its signal. Position sized to risk 2% of cash at a 2-ATR stop. Sells
 * on a 20-bar-low trailing stop.
 * When it does NOT work: fails in low-volatility assets where squeezes are
 * rare (BNB). A breakout that immediately reverses still loses. Lags strong
 * melt-ups by waiting for a squeeze + breakout confirmation.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || atr == null) return null;

  // bandwidth = (upper-lower)/mid, a squeeze when it is below its 50-bar avg
  const mid = bb.mid;
  if (mid <= 0) return null;
  const bw = (bb.upper - bb.lower) / mid;
  const bbNow = ctx.bb(20, 2, 0);
  const midNow = bbNow && bbNow.mid ? bbNow.mid : mid;
  if (midNow <= 0) return null;
  const bwNow = (bbNow.upper - bbNow.lower) / midNow;

  // average bandwidth over 50 prior bars
  let bwSum = 0, bwN = 0;
  for (let k = 1; k <= 50; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null || b.mid <= 0) continue;
    bwSum += (b.upper - b.lower) / b.mid;
    bwN++;
  }
  if (bwN === 0) return null;
  const bwAvg = bwSum / bwN;

  if (pos > 0) {
    // trailing exit at the 20-bar low
    const low20 = ctx.low(20, 1);
    if (low20 != null && price < low20) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  // squeeze: current bandwidth below its 50-bar average (volatility contracted)
  if (bwNow >= bwAvg) return null;
  // breakout: price above the upper band, MACD bullish
  if (price <= bbNow.upper) return null;
  const macd = ctx.macd(12, 26, 9, 1);
  if (macd == null || macd.macd <= macd.signal) return null;

  // risk-size: risk 2% of cash at a 2-ATR stop
  const risk = ctx.cash * 0.02;
  const stopDist = atr * 2;
  if (stopDist <= 0) return null;
  const qty = Math.min(risk / stopDist, (ctx.cash / price) * 0.98);

  ctx.state.lastExit = ctx.i;
  return { side: 'buy', qty };
}
