/*
 * @coinsori-strategy v1
 * name: Onchain Demand Fast BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Variant of the validated on-chain demand strategy (id 2772)
 * using a FASTER 15-bar lookback instead of 30. Goal: catch demand turnarounds
 * sooner to reduce the melt-up lag (the 30-bar version lagged buy-and-hold in
 * W2/W3). Test is on the SAME windows so it is a fair comparison, not a re-tune.
 * When it buys and sells: holds BTC while smoothed demand rises vs ~15 days ago;
 * sells when it clearly turns down.
 * When it does NOT work: a faster lookback may add churn and lose the smoothing
 * that made the 30-bar version clean; if it whipsaws, revert to 30.
 */
function onUpdate(ctx) {
  const pos = ctx.position;

  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 15) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 15) return null;
  const past = hist[0]; // ~14 bars ago

  const rising = now > past * 1.005;
  const falling = now < past * 0.995;

  if (pos > 0) {
    if (falling) return { side: 'sell', qty: pos };
    return null;
  }
  if (rising) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
