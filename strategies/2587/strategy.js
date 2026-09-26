/*
 * @coinsori-strategy v1
 * name: Macro Risk-On DXY Gate BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A different signal source than the price/macro-fed champion.
 * The dollar index (DXY) is an engine-served macro series (no user DB needed).
 * A falling/weak dollar means supportive global liquidity, historically good for
 * risk assets like BTC; a sharply rising dollar is a headwind. This gates a
 * simple BTC trend position on the dollar regime to test whether macro risk
 * sentiment, not price alone, adds value.
 * When it buys and sells: long BTC when price is above its 100-day EMA AND DXY
 * is not rising sharply (risk-on); exits when price falls below the 100-day EMA
 * or DXY spikes up sharply (risk-off).
 * When it does NOT work: if the DXY macro series is missing on this venue the
 * gate disables (degenerates to a plain EMA trend); in liquidity-driven melt-ups
 * where BTC rises despite a firm dollar; and it gives back ground in sharp
 * reversals before the EMA exit triggers.
 */
function onUpdate(ctx) {
  const ema100 = ctx.ema(100, 1);
  const price = ctx.price;
  const pos = ctx.position;
  if (ema100 == null) return null;

  // DXY has no ago arg; roll the previous bar's value manually on bar change.
  const dxy = ctx.macro('dxy');
  const st = ctx.state;
  if (st.lastBarI !== ctx.i) {
    st.prevDxy = st.curDxy ?? null;
    st.lastBarI = ctx.i;
  }
  st.curDxy = dxy;
  const dxyRising = (dxy != null && st.prevDxy != null && dxy > st.prevDxy * 1.002);

  if (pos > 0) {
    if (price < ema100) return { side: 'sell', qty: pos };
    if (dxyRising) return { side: 'sell', qty: pos };
    return null;
  }

  if (price > ema100 && !dxyRising) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
