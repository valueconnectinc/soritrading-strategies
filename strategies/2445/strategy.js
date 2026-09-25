/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge Breakout + Sentiment Gate
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Combines the two validated families from this project. The
 *   volume-surge breakout is the return engine (validated on BTC/ETH/SOL), and the
 *   Fear&Greed sentiment gate added defensive value in bear markets across assets.
 *   Bet: filtering out entries taken during extreme greed (froth) keeps the breakout
 *   from buying blow-off tops, lowering drawdown while keeping most of the upside.
 * When it buys and sells: Buy on a 20-bar high break with >1.5x average volume AND
 *   Fear&Greed below 80 (not extreme greed). Sell when price closes below the 20-bar low.
 * When it does NOT work: If greed stays extreme through a whole melt-up, the gate keeps
 *   it in cash and it lags the rally (same risk as the euphoria-exit experiment that
 *   hurt ETH). It is long-only, so it misses short-side gains in bears.
 */
function onUpdate(ctx) {
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    if (price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  // entry: 20-bar high break on above-average volume AND not extreme greed
  const fg = ctx.data('fear_greed');
  if (price > hh && vol > avgVol * 1.5) {
    // sentiment gate: skip entries when the market is in extreme greed (froth)
    if (fg != null && fg >= 80) return null;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
