/*
 * @coinsori-strategy v1
 * name: HashrateCapitulation
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin miners capitulate (sell) when hashrate falls below its 30-day average; bottoms form and price recovers when hashrate turns back up.
 * When it buys and sells: buys when hashrate crosses back above its 30-day average; sells when hashrate crosses below its 30-day average again.
 * When it does NOT work: in prolonged bear markets hashrate can stay depressed for months, so the strategy sits in cash and misses the start of the next rally; it also does nothing if hashrate data is missing for a bar.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  if (hr == null || hrSma == null) return null;

  const above = hr > hrSma;
  const prev = ctx.state.prev; // 'above' | 'below' | undefined

  let order = null;
  if (prev === 'below' && above) {
    // miner recovery confirmed — buy the bottom
    order = { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (prev === 'above' && !above) {
    // capitulation starting — get out
    order = { side: 'sell', qty: ctx.position };
  }
  ctx.state.prev = above ? 'above' : 'below';
  return order;
}
