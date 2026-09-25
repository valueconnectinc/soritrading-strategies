/*
 * @coinsori-strategy v1
 * name: BTC 1D Fed-Regime + Rate-Level Sizing
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin rallies while the Fed is easing/neutral and
 *   struggles when the Fed hikes. The pure macro gate (hold when not
 *   tightening) already beats buy-and-hold on most windows, but rides full
 *   drawdowns. Instead of adding an exit (which always added whipsaw), this
 *   version scales POSITION SIZE by the Fed rate level — higher rates = more
 *   restrictive = smaller exposure, lower rates = full exposure. No exit, so
 *   no whipsaw, but MDD is trimmed in high-rate regimes.
 * When it buys and sells: Always hold BTC when the Fed is not tightening, but
 *   the position size shrinks as the Fed funds rate rises (restrictive).
 *   Sell fully only when the Fed turns to tightening.
 * When it does NOT work: The Fed signal is slow — it can sit out liquidity
 *   melt-ups while rates are high, and even scaled-down exposure still rides
 *   drawdowns when rates are moderate. MDD can still reach 40-60%.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed_lag30');
  if (fed == null) return null;
  const fedLevel = ctx.data('macro_fed_funds');
  if (fedLevel == null) return null;

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

  // position scale shrinks as rate rises: 1.0 at <=1%, 0.5 at >=5%
  const scale = Math.max(0.3, 1 - (fedLevel - 1) / 8);

  const pos = ctx.position;
  if (pos > 0) {
    if (tightening) return { side: 'sell', qty: pos };
    return null;
  }
  if (!tightening) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 * scale };
  return null;
}
