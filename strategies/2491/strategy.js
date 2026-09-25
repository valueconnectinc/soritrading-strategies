/*
 * @coinsori-strategy v1
 * name: BTC 1D Fed-Regime + ATR Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a risk asset that historically rallies while the
 *   central bank is easing or neutral, and struggles when the Fed is actively
 *   hiking. Gating a long position on the Fed's policy direction keeps us in the
 *   friendly regime and in cash during the hostile one. A wide ATR trailing stop
 *   replaces the sharp SMA exit so we do not get whipsawed out of choppy rallies.
 * When it buys and sells: Buy when the Fed funds rate is NOT tightening (not
 *   more than 0.5pp above its level ~6 months earlier). Exit when price falls
 *   3x ATR below the highest close since entry, or when the Fed turns to
 *   tightening.
 * When it does NOT work: The Fed signal is slow and macro-driven — it can sit
 *   out liquidity-driven melt-ups that run while rates are still nominally high,
 *   and the 3x ATR trail still allows deep drawdowns in fast crashes.
 */
function onUpdate(ctx) {
  const fed = ctx.data('fed_lag30'); // Fed funds rate, lagged 30 days to avoid lookahead
  if (fed == null) return null;

  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    if (s.hist) s.hist.push(fed);
    else s.hist = [fed];
    if (s.hist.length > 200) s.hist.shift();
    s.lastBarI = ctx.i;
  }
  const h = s.hist;
  // need ~6 months (180 days) of Fed history to know the direction
  if (!h || h.length < 180) return null;

  const cur = h[h.length - 1];
  const past = h[h.length - 181]; // rate ~6 months ago
  const tightening = cur - past > 0.5; // hiked by more than 0.5pp in 6 months

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const price = ctx.price;
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    if (price < stop || tightening) return { side: 'sell', qty: pos };
    return null;
  }
  if (!tightening) {
    s.highest = ctx.price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
