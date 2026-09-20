/*
 * @coinsori-strategy v1
 * name: BTC ATR Trailing Trend 4h
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A genuinely different family from the mean-reversion work
 * done so far. Instead of buying dips, this is a trend-follower: it buys when
 * price breaks above a recent high (a breakout = momentum has arrived) and
 * rides the trend using an ATR trailing stop that ratchets up with price. It
 * profits from sustained directional moves and cuts losses fast when a
 * breakout fails.
 * When it buys and sells: buy when price closes above the highest high of the
 * last 55 bars (Donchian breakout). While long, trail a stop at the highest
 * close since entry minus 3*ATR; exit when price closes below that stop. This
 * lets winners run and caps losers.
 * When it does NOT work: in a long sideways / choppy market the breakout is
 * repeatedly triggered then stopped out (whipsaw), bleeding small losses with
 * no trend to ride. It also gives back a chunk of profit on every trend
 * reversal because the trailing stop is below the peak.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  const high = ctx.high(55, 1); // highest high of last 55 bars (excl current)
  if (high == null) return null;

  if (pos <= 0) {
    // breakout: current price above the 55-bar high = momentum
    if (price > high) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // trailing stop: track the highest close since entry, exit 3*ATR below it
    const peak = ctx.state && ctx.state.peak ? ctx.state.peak : price;
    const newPeak = Math.max(peak, price);
    ctx.state = ctx.state || {};
    ctx.state.peak = newPeak;
    const stop = newPeak - 3 * atr;
    if (price < stop) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
