/*
 * @coinsori-strategy v1
 * name: BTC 1D Fed-Regime + FearGreed Top Exit
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin rallies while the Fed is easing/neutral and
 *   struggles when the Fed hikes. But during Fed-stable periods it can still
 *   suffer deep drawdowns. Adding a price-trend exit only added whipsaw, so
 *   this version uses a SECOND slow sentiment signal — the fear/greed index —
 *   to trim exposure only at extreme-greed tops, which is not a fast price
 *   signal so it should not whipsaw.
 * When it buys and sells: Hold BTC when the Fed is not tightening (rate not
 *   >0.5pp above 6 months ago). Go to cash when the Fed turns to tightening OR
 *   when fear/greed reaches extreme greed (a slow top warning).
 * When it does NOT work: The macro signals are slow — it can sit out
 *   liquidity-driven melt-ups while rates stay high, and the greed exit can
 *   exit early in strong bull runs. MDD can still reach 40-60%.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed_lag30');
  if (fed == null) return null;
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;

  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    if (s.hist) s.hist.push(fed);
    else s.hist = [fed];
    if (s.hist.length > 200) s.hist.shift();
    s.lastBarI = ctx.i;
  }
  const h = s.hist;
  if (!h || h.length < 181) return null;

  const cur = h[h.length - 1];
  const past = h[h.length - 181];
  const tightening = cur - past > 0.5;

  // extreme greed = top warning; de-risk (slow sentiment, not price whipsaw)
  const extremeGreed = fg >= 80;

  const pos = ctx.position;
  if (pos > 0) {
    if (tightening || extremeGreed) return { side: 'sell', qty: pos };
    return null;
  }
  if (!tightening && !extremeGreed) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
