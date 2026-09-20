/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride + Rising SMA Filter 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The plain 200-SMA trend ride is a solid champion but it
 * whipsaws in long choppy markets (W2 chop: +19% vs +36% buy-and-hold). A big
 * cause is entering on any close above the SMA even when the SMA itself is flat
 * or falling — i.e. no real trend. Requiring the 200-SMA to be rising filters
 * out those weak/choppy entries so it only commits when a genuine uptrend is
 * underway. The crash protection (SMA cross exit) is left untouched.
 * When it buys and sells: buy on a close crossing above the 200-SMA only when
 * the 200-SMA is also rising (higher than it was 20 bars ago); hold while above
 * it; sell on a close back below the 200-SMA.
 * When it does NOT work: in a strong new bull that starts from a falling SMA it
 * delays entry and misses the first leg; in chop it still whipsaws on the exit
 * side even if entries are filtered.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const sma20ago = ctx.sma(200, 21); // 200-SMA 20 bars earlier, to check slope
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || sma20ago == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // buy on a close crossing above the 200-SMA AND the SMA itself is rising
    // (slope filter removes entries into flat/falling chop)
    if (closePrev2 <= smaP && closePrev > sma && sma > sma20ago) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
