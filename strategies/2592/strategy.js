/*
 * @coinsori-strategy v1
 * name: Fear-Greed Contrarian Mean Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Contrarian sentiment mean-reversion. Buying at extreme
 * fear (index<20) directly catches falling knives — the index stays fearful
 * while price keeps dropping. Instead we wait for a CONFIRMED fear bottom:
 * the index must first be below 20 (deep fear) and then recover above 25 on
 * the next bar, signalling sentiment has turned. This buys the turn, not the
 * knife.
 * When it buys and sells: buys when index recovers above 25 after being <20
 * on the prior bar; exits when index turns greedy (>60) or a 3x-ATR stop.
 * When it does NOT work: in prolonged bears the index may never recover above
 * 25 cleanly, so it sits in cash; a recovery that then reverses still loses.
 * Requires the agent online (reads ctx.data 'fg').
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Track the previous bar's fg value in state. onUpdate runs per tick, so
  // only roll the snapshot when the bar index changes.
  const st = ctx.state;
  if (st.lastBarI !== ctx.i) {
    st.prevFg = st.curFg ?? null;
    st.lastBarI = ctx.i;
  }
  st.curFg = fg;

  if (pos > 0) {
    if (fg > 60) return { side: 'sell', qty: pos };
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    return null;
  }

  // Bottom-confirmation entry: prior bar was deeply fearful (<20) and current
  // bar has recovered above 25. Wait for the turn, don't catch the knife.
  if (st.prevFg != null && st.prevFg < 20 && fg > 25) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
