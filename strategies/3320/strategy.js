/*
 * @coinsori-strategy v1
 * name: BTC Funding Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Binance funding rate shows how crowded leveraged
 * positioning is. Extreme positive funding = too many longs (risk of a long
 * squeeze, and a blow-off top); extreme negative funding = too many shorts
 * (contrarian buying opportunity). We fade the crowd.
 * When it buys and sells: buys when daily funding is more than 1.5 std below
 * its own 90-day average (crowded short); sells when funding is more than 1.5
 * std above its average (crowded long) or price falls 25% below entry.
 * When it does NOT work: in a strong one-way bull, funding stays mildly
 * positive and we hold through corrections; buying extreme-negative funding can
 * catch a falling knife in a real crash (the 25% stop caps that). It is
 * long-only, so it makes nothing in sustained bears.
 */
function onUpdate(ctx) {
  const f = ctx.funding; // current funding rate
  if (f == null) return null;

  const st = ctx.state;
  if (!st.fHist) st.fHist = [];
  st.fHist.push(f);
  if (st.fHist.length > 91) st.fHist.shift();
  if (st.fHist.length < 91) return null; // need 90 days of funding history

  const arr = st.fHist.slice(0, -1); // exclude the current value from the baseline
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((s, x) => s + (x - mean) * (x - mean), 0) / arr.length);
  if (std <= 0) return null;
  const z = (f - mean) / std;

  const EXTREME = 1.5; // 1.5 std = genuinely crowded positioning, not noise
  const STOP = 0.75; // -25%: buying extreme fear can catch a knife, so cap it

  if (ctx.position <= 0) {
    if (z < -EXTREME) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    ctx.watch([{ side: 'buy', price: ctx.price, trigger: 'below', note: 'funding extreme negative', conds: [
      { label: 'funding z-score', now: z, op: '<', ref: -EXTREME }
    ]}]);
    return null;
  }

  if (ctx.entryPx != null && ctx.price < ctx.entryPx * STOP) {
    return { side: 'sell', qty: ctx.position };
  }
  if (z > EXTREME) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([{ side: 'sell', price: ctx.entryPx != null ? ctx.entryPx * STOP : ctx.price, trigger: 'below', note: 'hard stop -25%' }]);
  return null;
}
