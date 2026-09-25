/*
 * @coinsori-strategy v1
 * name: BTC 1D Fed-Direction Only
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a risk asset that historically rallies while the
 *   central bank is easing or neutral, and struggles when the Fed is actively
 *   hiking. This version holds BTC whenever the Fed is NOT tightening and goes
 *   to cash when it is — a slow macro gate with very low turnover. Every overlay
 *   tried (price-trend exit, fear/greed exit, rate-level sizing) either added
 *   whipsaw or cut bull-run capture, so the pure macro gate is kept.
 * When it buys and sells: Buy when the Fed funds rate is not more than 0.5pp
 *   above its level ~6 months earlier (not tightening). Sell when the Fed turns
 *   to tightening.
 * When it does NOT work: The Fed signal is slow and macro-driven — it can sit
 *   out liquidity-driven melt-ups that run while rates are still high, and with
 *   no price filter it rides full drawdowns during Fed-stable bear markets
 *   (MDD can reach 50-60%).
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed_lag30');
  if (fed == null) return null;

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

  const pos = ctx.position;
  if (pos > 0) {
    if (tightening) return { side: 'sell', qty: pos };
    return null;
  }
  if (!tightening) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
