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
 * risk assets like BTC; a rising dollar regime is a headwind. This gates a BTC
 * trend position on the dollar regime to test whether macro risk sentiment adds
 * value over price alone.
 * When it buys and sells: long BTC when price is above its 100-day EMA AND the
 * dollar is not in a rising regime (20-day DXY avg below 60-day avg); exits when
 * price falls below the 100-day EMA or the dollar turns to a rising regime.
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

  const dxy = ctx.macro('dxy');
  const st = ctx.state;
  if (st.lastBarI !== ctx.i) {
    if (st.curDxy != null) {
      if (!st.dxyHist) st.dxyHist = [];
      st.dxyHist.push(st.curDxy);
      if (st.dxyHist.length > 60) st.dxyHist.shift();
    }
    st.lastBarI = ctx.i;
  }
  st.curDxy = dxy;
  const hist = st.dxyHist || [];
  let dxyRising = null;
  if (hist.length >= 60) {
    let s20 = 0, s60 = 0;
    for (let i = 0; i < 20; i++) s20 += hist[hist.length - 1 - i];
    for (let i = 0; i < 60; i++) s60 += hist[hist.length - 1 - i];
    dxyRising = (s20 / 20) > (s60 / 60) * 1.002;
  }

  if (pos > 0) {
    if (price < ema100) return { side: 'sell', qty: pos };
    if (dxyRising === true) return { side: 'sell', qty: pos };
    return null;
  }

  if (price > ema100 && dxyRising !== true) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
