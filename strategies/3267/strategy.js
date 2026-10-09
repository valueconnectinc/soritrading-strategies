/*
 * @coinsori-strategy v1
 * name: FearGreedDipBuyer
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Fear & Greed index measures crowd sentiment. Extreme
 * fear (index below 25) marks panic-selling bottoms, and when that panic happens
 * inside a bull market (price above its 200-day average) it has historically been
 * a good dip-buying point.
 * When it buys and sells: buys when the index is below 25 AND price is above its
 * 200-day average; sells when the index climbs above 65 (greed) or price falls
 * 20% below the entry (hard stop).
 * When it does NOT work: in a long bear market price stays below the 200-day
 * average so it never buys — it misses the eventual bottom; and if the index
 * stays low while price keeps falling, the 20% stop cuts losses repeatedly.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // index unknown — do nothing
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const pos = ctx.position;
  const price = ctx.price;

  if (pos > 0) {
    // hard stop: -20% from entry protects against a failed bounce
    if (ctx.entryPx != null && price <= ctx.entryPx * 0.8) {
      return { side: 'sell', qty: pos };
    }
    // take profit when crowd turns greedy
    if (fg > 65) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // only buy panic inside an uptrend — never catch a falling knife in a bear
  if (fg < 25 && price > sma200) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
