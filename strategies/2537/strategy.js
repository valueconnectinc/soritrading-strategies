/*
 * @coinsori-strategy v1
 * name: FedData Diagnostic
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure diagnostic. Confirms whether ctx.data('fed') (fed funds
 * rate) is readable and changes over time in the backtest feed. On-chain active-address
 * data turned out to be constant per-bar (unreliable), so I verify the fed dataset the
 * same way before building a strategy on it.
 * When it buys and sells: buys 1 unit whenever the fed rate is a valid non-null number
 * and above 0, so any trade count proves the data arrives.
 * When it does NOT work: n/a — diagnostic only.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed');
  if (fed == null) return null;
  if (ctx.position > 0) return null;
  // Buy once to prove the fed value is non-null and positive at some point.
  if (fed > 0) return { side: 'buy', qty: 0.001 };
  return null;
}
