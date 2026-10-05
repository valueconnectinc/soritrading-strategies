/*
 * @coinsori-strategy v1
 * name: XRP 1D Bollinger-Stoch Mean Reversion
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same defensive mean-reversion recipe that validated on
 * ETH 4h (Bollinger lower band + oversold stochastic, gated by an uptrend
 * filter) applied to XRP on daily bars. The 200-day gate was too strict for
 * XRP — it stayed below its 200-day average for years after 2018, blocking all
 * recovery entries — so this uses a 100-day gate instead.
 * When it buys and sells: buys when XRP is above its 100-day average AND the
 * close touches the lower Bollinger band AND stochastic K < 20. Sells when
 * price recovers to the middle band or K > 80. No stop-loss — waiting for the
 * snap-back beats any stop on this recipe.
 * When it does NOT work: in a sustained bear market the uptrend gate keeps it
 * in cash (misses bounces); in long chop the snap-back can be slow and it holds
 * through sharp crashes waiting for recovery.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const stc = ctx.stoch(14, 3, 1);
  const sma100 = ctx.sma(100, 1);
  if (bb == null || stc == null || sma100 == null) return null;

  const lower = Array.isArray(bb) ? bb[2] : bb.lower;
  const mid = Array.isArray(bb) ? bb[1] : bb.mid;
  if (!Number.isFinite(lower) || !Number.isFinite(mid)) return null;
  const k = Array.isArray(stc) ? stc[0] : stc.k;
  if (k == null || !Number.isFinite(k)) return null;

  const S = ctx.state;
  let cd = S.cd || 0;
  if (cd > 0) cd--;
  S.cd = cd;

  ctx.watch([
    { side: 'buy', price: lower, note: 'BB lower band' },
    { side: 'sell', price: mid, note: 'snap-back to mid band' }
  ]);

  const pos = ctx.position;
  if (pos > 0) {
    if ((price >= mid || k > 80) && cd === 0) {
      S.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // 100-SMA trend gate + touch lower band + oversold stochastic (closed bars).
  if (price <= lower && k < 20 && price > sma100 && cd === 0) {
    S.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
