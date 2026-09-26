/*
 * @coinsori-strategy v1
 * name: VWAP-Pullback Mean Reversion ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In an uptrend, price regularly pulls back to the
 * volume-weighted average price (VWAP) before resuming higher. Buying these
 * VWAP pullbacks captures mean reversion WITH the trend — unlike the defensive
 * band-bounce, this one participates in bull runs. A 200-SMA filter keeps it
 * long-only in confirmed uptrends.
 * When it buys and sells: buys when price closes below a rolling VWAP while
 * above the 200-SMA; exits when price extends above VWAP (overextension) or
 * RSI turns overbought, or price drops below the 200-SMA.
 * When it does NOT work: in a downtrend below the 200-SMA it never buys (safe
 * but idle); VWAP pullbacks in choppy sideways markets whipsaw; a sharp
 * reversal that breaks the 200-SMA while holding a position still loses.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || rsi == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Rolling VWAP over the last 50 bars from closes and volumes.
  let sumPV = 0, sumV = 0;
  for (let k = 1; k <= 50; k++) {
    const c = ctx.closes[ctx.closes.length - 1 - k];
    const v = ctx.volumes[ctx.volumes.length - 1 - k];
    if (c == null || v == null) return null;
    sumPV += c * v;
    sumV += v;
  }
  if (sumV <= 0) return null;
  const vwap = sumPV / sumV;

  if (pos > 0) {
    // Exit: overextension above VWAP, RSI overbought, or trend break.
    if (price > vwap * 1.04 || rsi > 70 || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < sma200) return null;

  // Entry: pullback below VWAP in an uptrend, RSI not crashed.
  if (price < vwap && rsi > 35) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
