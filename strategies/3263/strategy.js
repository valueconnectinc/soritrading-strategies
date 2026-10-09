/*
 * @coinsori-strategy v1
 * name: Volatility Squeeze Trend
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: calm periods (very low Bollinger bandwidth) are usually followed by sharp moves.
 * We only buy when volatility has compressed first, so we skip the chop that kills naive breakouts,
 * and we ride the move with a trailing stop instead of bailing at the first pullback.
 * When it buys and sells: buys when the previous bar's bandwidth was in the bottom 10% of the last
 * 200 bars AND price closed above the upper Bollinger band; sells when price falls 3x ATR from the
 * highest close since entry (trailing stop).
 * When it does NOT work: in a persistent downtrend a squeeze "breakout" is often a fakeout and the
 * trailing stop takes the loss — this is long-only, so a long bear market bleeds slowly.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || atr == null || bb.upper == null || bb.mid == null || bb.lower == null) return null;

  const bw = (bb.upper - bb.lower) / bb.mid; // bandwidth of the last closed bar

  const st = ctx.state;
  if (!Array.isArray(st.bw)) st.bw = [];
  st.bw.push(bw);
  if (st.bw.length > 210) st.bw.shift();
  if (st.bw.length < 201) return null; // need 200 prior readings before judging a squeeze

  const prevBw = st.bw.at(-2); // bandwidth 2 bars ago (closed)
  const prevClose = ctx.closes.at(-2); // last closed bar close
  const pos = ctx.position || 0;

  if (pos <= 0) {
    // entry: previous bar's bandwidth in bottom decile of the 200 before it AND price broke above its upper band
    const prior = st.bw.slice(0, -2).sort((a, b) => a - b);
    const p10 = prior[Math.floor(prior.length * 0.1)];
    const wasSqueeze = prevBw <= p10;
    const bbPrev = ctx.bb(20, 2, 2);
    if (bbPrev == null || bbPrev.upper == null) return null;
    if (wasSqueeze && prevClose > bbPrev.upper) {
      st.maxClose = prevClose;
      const stopPx = prevClose - 3 * atr;
      ctx.watch([{ side: 'sell', price: stopPx, trigger: 'below', note: 'chandelier 3xATR stop' }]);
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    return null;
  }

  // trailing stop: 3xATR below the highest close since entry
  if (prevClose > (st.maxClose || prevClose)) st.maxClose = prevClose;
  const stopPx = st.maxClose - 3 * atr;
  ctx.watch([{ side: 'sell', price: stopPx, trigger: 'below', note: 'chandelier 3xATR stop' }]);
  if (prevClose < stopPx) {
    st.maxClose = 0;
    return { side: 'sell', qty: pos };
  }
  return null;
}
