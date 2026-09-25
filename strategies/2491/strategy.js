/*
 * @coinsori-strategy v1
 * name: BTC 1D Fed-Regime Trend + ATR Buffer
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin is a risk asset that historically rallies while the
 *   central bank is easing or neutral, and struggles when the Fed is actively
 *   hiking. Gating a price-uptrend position on the Fed's policy direction keeps
 *   us in the friendly regime and in cash during the hostile one. A small ATR
 *   buffer on the trend-break exit reduces whipsaw in choppy rallies.
 * When it buys and sells: Buy when price is above its 50-day average AND the Fed
 *   funds rate is NOT tightening (not more than 0.5pp above its level ~6 months
 *   earlier). Exit when price falls below a small ATR buffer under the 50-day
 *   average, or when the Fed turns to tightening.
 * When it does NOT work: The Fed signal is slow and macro-driven — it can sit out
 *   liquidity-driven melt-ups that run while rates are still nominally high, and
 *   it lags sharp turns in policy.
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
  if (!h || h.length < 180) return null;

  const cur = h[h.length - 1];
  const past = h[h.length - 181]; // rate ~6 months ago
  const tightening = cur - past > 0.5; // hiked by more than 0.5pp in 6 months

  const sma = ctx.sma(50, 1);
  if (sma == null) return null;
  const atr = ctx.atr(14, 1);
  const price = ctx.price;

  const pos = ctx.position;
  if (pos > 0) {
    // exit on trend break below a small ATR buffer, or on Fed tightening
    const exitLevel = sma - (atr == null ? 0 : 0.5 * atr);
    if (price < exitLevel || tightening) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > sma && !tightening) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
