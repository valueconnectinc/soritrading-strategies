/*
 * @coinsori-strategy v1
 * name: BTC 4H Keltner MR HalfTP + TrendRide
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated BTC 4h champion (200-SMA gated Keltner MR) sells 100% at
 * the EMA20 mid-band, which leaves the continued melt-up on the table after a bull pullback.
 * This variant keeps the exact same entry but splits the exit: half take-profit at the
 * mid-band (locks the validated gain), half keeps riding until price falls back below the
 * mid-band. Tests whether capturing the continuation improves the champion without adding
 * drawdown — one mechanism change, no curve fit.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with RSI(14)<40
 * AND price is above the 200-SMA (uptrend only). Sells half when price recovers above the
 * 20-EMA, sells the rest when price later closes back below the 20-EMA. 2-bar cooldown.
 * When it does NOT work: the riding half gives back gains in a choppy recovery that rolls
 * over just above the mid-band; in a straight-line melt-up it still sits in cash between
 * pullbacks. Defensive pullback strategy, not a chaser.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma200 == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Phase 1 (full position): half take-profit at the mid-band, keep the rest riding.
    if (st.phase === 1 && price > ema20 && cd === 0) {
      st.phase = 2;
      return { side: 'sell', qty: pos * 0.5 };
    }
    // Phase 2 (riding half): exit when price falls back below the mid-band.
    if (st.phase === 2 && price < ema20 && cd === 0) {
      st.phase = 0;
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  // 200-SMA trend gate: only buy pullbacks in an uptrend, to avoid bear-market knives
  if (price < keltnerLow && rsi < 40 && price > sma200 && cd === 0) {
    st.phase = 1;
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
