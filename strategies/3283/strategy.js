/*
 * @coinsori-strategy v1
 * name: Donchian Breakout Trend + ATR Trail
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A strong breakout to a multi-month high tends to keep trending in
 * crypto (classic turtle breakout bet). Unlike the previous version that sold at the
 * channel mid (capping winners), this version trails the stop below the highest close
 * since entry so winners run further in bulls while reversals are still cut.
 * When it buys and sells: Buys when price breaks above the highest high of the last 55
 * days while the 200-day trend is up. Sells when price drops 2.5x ATR below the highest
 * close since entry (trailing stop) or 2x ATR below entry (hard stop).
 * When it does NOT work: In long sideways ranges false breakouts trigger repeated small
 * losses (whipsaw). A sudden crash can gap through the trail. Expect losses in chop;
 * this is a trend-only strategy.
 */
function onUpdate(ctx) {
  const n = 55;          // Donchian channel length — classic turtle 55-day breakout
  const trend = 200;     // long-term trend filter — only take breakouts above it
  const trailMult = 2.5; // trailing stop distance in ATR units below highest close since entry
  const stopMult = 2.0;  // hard stop distance in ATR units below entry
  const atrN = 14;

  const price = ctx.price;
  const pos = ctx.position;

  const upper = ctx.high(n);
  const lower = ctx.low(n);
  const atr = ctx.atr(atrN);
  const ema200 = ctx.ema(trend);
  if (upper == null || lower == null || atr == null || ema200 == null) return null;

  const prevUpper = ctx.high(n, 1); // Donchian high of the last CLOSED bar
  if (prevUpper == null) return null;

  if (pos === 0) {
    ctx.watch([{ side: 'buy', price: prevUpper, trigger: 'above', note: '55d high breakout' }]);
    if (price > prevUpper && price > ema200) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // Track the highest close since entry so the trail is anchored to the real peak.
  const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
  ctx.state.peak = peak;
  const trailStop = peak - trailMult * atr; // 2.5 ATR below the peak = let winners run
  const hardStop = ctx.entryPx - stopMult * atr; // 2 ATR below entry = never let a winner turn into a loss
  const stopPx = Math.max(trailStop, hardStop);  // the tighter of the two
  ctx.watch([{ side: 'sell', price: stopPx, trigger: 'below', note: 'trail/hard stop' }]);
  if (price <= stopPx) {
    ctx.state.peak = null;
    return { side: 'sell', qty: pos };
  }
  return null;
}
