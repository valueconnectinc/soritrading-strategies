/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Fear & Greed index is a 0-100 crowd-sentiment gauge.
 * It mean-reverts — extreme fear (crowd panic) marks short-term bottoms, extreme
 * greed marks tops. This is a sentiment-driven contrarian, a different family
 * from the price-band mean reversion champion. The dataset is backfilled so it
 * can actually be validated (unlike macro/funding which return null in backtest).
 * When it buys and sells: buys when the index is deeply fearful (<20) and enough
 * bars have passed since the last exit; sells when the crowd turns greedy (>68)
 * or after 40 bars to cap a stale position.
 * When it does NOT work: in a prolonged bear market the index can stay in extreme
 * fear for months and every "contrarian buy" is a knife — the cooldown and the
 * 40-bar cap limit, but do not eliminate, that bleed.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // sentiment unknown -> do nothing

  const lastExit = ctx.state.lastExit || -9999;
  const barsSinceExit = ctx.i - lastExit;
  const cooldownOk = barsSinceExit >= 5; // wait 5 bars after each exit (proven in champion)

  // BUY: extreme fear + cooldown satisfied + flat
  if (fg < 20 && cooldownOk && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: crowd turns greedy, or position held too long (stale -> exit)
  const held = ctx.i - (ctx.state.entryBar || ctx.i);
  if (ctx.position > 0 && (fg > 68 || held >= 40)) {
    ctx.state.lastExit = ctx.i;
    return { side: 'sell', qty: ctx.position };
  }

  // record entry bar on the buy bar so held can be measured next bar
  if (ctx.position > 0 && ctx.state.entryBar == null) {
    ctx.state.entryBar = ctx.i;
  }

  return null;
}
