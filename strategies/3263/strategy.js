/*
 * @coinsori-strategy v1
 * name: Volatility Squeeze Breakout
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: calm periods (very low Bollinger bandwidth) are usually followed by sharp moves.
 * We only buy when volatility has compressed first, so we skip the chop that kills naive breakouts.
 * When it buys and sells: buys when the previous bar was the quietest of the last ~100 bars AND price
 * closed above the upper Bollinger band; sells when price closes back below the middle band or falls
 * 2.5x ATR below entry.
 * When it does NOT work: in a persistent downtrend a squeeze "breakout" is often a fakeout and the stop
 * takes the loss — this is long-only, so a long bear market bleeds slowly.
 */

function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || atr == null || bb.upper == null || bb.mid == null || bb.lower == null) return null;

  const bw = (bb.upper - bb.lower) / bb.mid; // bandwidth of the last closed bar

  const st = ctx.state;
  if (!Array.isArray(st.bw)) st.bw = [];
  st.bw.push(bw);
  if (st.bw.length > 110) st.bw.shift();
  if (st.bw.length < 101) return null; // need ~100 prior readings before judging a squeeze

  const prevBw = st.bw.at(-2); // bandwidth 2 bars ago (closed)
  const prevClose = ctx.closes.at(-2); // last closed bar close
  const pos = ctx.position || 0;

  if (pos <= 0) {
    // entry: previous bar was the quietest of the ~99 before it AND price broke above its upper band
    const prevMin = Math.min(...st.bw.slice(0, -2));
    const wasSqueeze = prevBw <= prevMin * 1.001; // 0.1% tolerance so the min itself counts as squeeze
    const bbPrev = ctx.bb(20, 2, 2);
    if (bbPrev == null || bbPrev.upper == null) return null;
    if (wasSqueeze && prevClose > bbPrev.upper) {
      const stopPx = prevClose - 2.5 * atr;
      ctx.watch([
        { side: 'sell', price: bbPrev.mid, trigger: 'below', note: 'exit at mid band' },
        { side: 'sell', price: stopPx, trigger: 'below', note: '2.5xATR stop' },
      ]);
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    return null;
  }

  // exit: close below mid band (breakout failed) or 2.5xATR stop
  const stopPx = (ctx.entryPx || prevClose) - 2.5 * atr;
  ctx.watch([
    { side: 'sell', price: bb.mid, trigger: 'below', note: 'exit at mid band' },
    { side: 'sell', price: stopPx, trigger: 'below', note: '2.5xATR stop' },
  ]);
  if (prevClose < bb.mid || prevClose < stopPx) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
