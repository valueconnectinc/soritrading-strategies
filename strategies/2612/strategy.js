/*
 * @coinsori-strategy v1
 * name: Relative-Strength Rotation BTC/ETH/SOL 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In crypto, capital does not move uniformly — one large-cap
 * major tends to lead a rally while the others lag. Instead of betting on a
 * single coin, this strategy holds the ONE that has been strongest recently and
 * switches to whichever becomes strongest, so it rides the leading asset of each
 * phase and avoids the laggards. This is cross-sectional momentum across assets,
 * a different family from the single-symbol trend followers.
 * When it buys and sells: it ranks BTC/ETH/SOL by their 30-day momentum; it
 * holds the top-ranked symbol, and switches to a new leader only when that
 * leader's 30-day momentum beats the current holding by a margin (to avoid
 * whipsawing between two coins of nearly equal strength). It is always fully
 * invested in one symbol when a leader is clearly ahead.
 * When it does NOT work: when all three majors move together in a broad crash,
 * rotation cannot help — it just holds the least-bad falling knife. It also
 * underperforms a single strong winner if one coin has a monster run, because
 * it keeps the whole portfolio in whichever is strongest but can lag a pure
 * buy-and-hold of that one coin during sharp reversals between leaders.
 */
function onUpdate(ctx) {
  const syms = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  const px = ctx.price;
  if (px == null) return null;

  // accumulate a rolling per-symbol price history in state
  const hist = ctx.state.hist || {};
  if (!hist[ctx.sym]) hist[ctx.sym] = [];
  hist[ctx.sym].push(px);
  if (hist[ctx.sym].length > 32) hist[ctx.sym].shift();
  ctx.state.hist = hist;

  // need 31 bars of history for every symbol before we can rank
  const mom = {};
  for (const s of syms) {
    const h = hist[s];
    if (!h || h.length < 31) return null;
    mom[s] = h[h.length - 1] / h[h.length - 31] - 1; // 30-day momentum
  }

  // leader = highest 30-day momentum
  let leader = syms[0];
  for (const s of syms) if (mom[s] > mom[leader]) leader = s;

  const pos = ctx.position;
  // margin: switch only when the new leader is clearly stronger than the
  // current holding, to avoid whipsaw between two coins of near-equal strength
  const margin = 0.03; // 3% momentum gap required to switch
  const current = ctx.sym;

  if (pos > 0) {
    // holding this symbol: stay unless another symbol is clearly stronger
    if (leader !== current && mom[leader] - mom[current] > margin) {
      return { side: 'sell', qty: pos }; // move capital out; the leader's own onUpdate will buy it
    }
    return null;
  }

  // flat on this symbol: buy only if this symbol is the clear leader
  if (leader === current) {
    const second = syms.filter(s => s !== current).reduce((a, s) => mom[s] > mom[a] ? s : a, syms.filter(s => s !== current)[0]);
    if (mom[current] - mom[second] > margin) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  return null;
}
