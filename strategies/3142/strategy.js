/*
 * @coinsori-strategy v1
 * name: ETH 4H Bollinger-Stoch Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: In an uptrend, a sharp drop to the lower volatility band
 * together with an oversold stochastic is usually an overreaction that snaps
 * back to the middle band. Uses standard-deviation bands (Bollinger) and the
 * stochastic oscillator — a different mechanism from the ATR-Keltner recipe.
 * When it buys and sells: buys only when ETH is above its 200-bar average
 * (uptrend) AND price touches the lower Bollinger band AND the stochastic is
 * oversold (K below 20). Sells when price recovers to the middle band, when the
 * stochastic turns overbought (K above 80), or on a WIDE protective stop at
 * entry minus 3.5x ATR (tail-risk cap only — a narrow stop whipsaws; a wide one
 * only cuts the worst crashes).
 * When it does NOT work: in a sustained bear market the uptrend gate keeps it in
 * cash (it misses the bounce); in long sideways chop the snap-back can be slow.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const stc = ctx.stoch(14, 3, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || stc == null || sma200 == null || atr == null || atr <= 0) return null;

  // bb may come back as {upper,mid,lower} or [upper,mid,lower] — accept both.
  const lower = Array.isArray(bb) ? bb[2] : bb.lower;
  const mid = Array.isArray(bb) ? bb[1] : bb.mid;
  if (!Number.isFinite(lower) || !Number.isFinite(mid)) return null;
  const k = Array.isArray(stc) ? stc[0] : stc.k; // stochastic K on the closed bar
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
    const stop = ctx.entryPx - 3.5 * atr; // wide tail-risk cap (3.5x ATR, not a tight stop)
    if (price < stop && cd === 0) {
      S.cd = 2;
      return { side: 'sell', qty: pos };
    }
    if ((price >= mid || k > 80) && cd === 0) {
      S.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // 200-SMA trend gate + touch lower band + oversold stochastic (closed bars).
  if (price <= lower && k < 20 && price > sma200 && cd === 0) {
    S.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
