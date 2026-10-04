/*
 * @coinsori-strategy v1
 * name: BTC 4H Trend-Gated Keltner MR SMA100
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same defensive Keltner mean-reversion recipe as the validated
 * 200-SMA version (3131), but with a faster 100-SMA trend gate. The question is whether
 * a quicker gate keeps the bear protection while catching more of the recent bull — a
 * robustness check on the single most influential parameter, not a curve fit.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with RSI(14)<40
 * AND price is above the 100-SMA (uptrend only); sells when price recovers above the 20-EMA.
 * 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in a straight-line melt-up it still sits in cash and can lag
 * buy-and-hold; a faster gate takes more trades so it whipsaws more in a choppy bear.
 * Defensive pullback strategy, not a chaser.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma100 = ctx.sma(100, 1);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma100 == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Exit once price recovers above the 20-EMA (channel mid) — the validated optimum exit.
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  // 100-SMA trend gate (faster than the 200 baseline) — only buy pullbacks in an uptrend
  if (price < keltnerLow && rsi < 40 && price > sma100 && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
