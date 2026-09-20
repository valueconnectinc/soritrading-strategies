/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed BullRegime Dip 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the standalone fear-greed mean reversion failed because it
 * bought panic in bears (falling knives). This version only buys fear when price is
 * above the 200-SMA — i.e. it buys dips inside an uptrend, not crashes in a bear —
 * and sells into extreme greed or when the bull regime ends.
 * When it buys and sells: buy when price is above SMA200 AND the Fear & Greed index
 * is <=30; sell when the index reaches >=65 (greed) or price drops below SMA200.
 * When it does NOT work: in a choppy range where price hovers around SMA200, the
 * regime flips cause whipsaw; and it sits in cash through entire bull runs if the
 * index never prints fear, missing the move.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  const pos = ctx.position;
  if (fg == null || price == null || sma200 == null) return null;

  if (pos <= 0) {
    // buy a dip only inside a bull regime (price above 200-SMA) — avoids bear falling knives
    if (price > sma200 && fg <= 30) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit on extreme greed (>=65) or when the bull regime breaks down
    if (fg >= 65 || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
