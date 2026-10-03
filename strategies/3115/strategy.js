/*
 * @coinsori-strategy v1
 * name: SOL Keltner MR 4H Trend-Gated
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Out-of-sample test of the 200-SMA trend-gated Keltner
 * mean-reversion recipe. The base recipe validated positive on SOL 4h; this checks
 * whether adding the 200-SMA gate (which cut ADA's drawdown in half) also helps SOL
 * or hurts it. Buys deep pullbacks only in an uptrend, sells snap-backs to the mid-band.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with
 * RSI(14)<40 AND above the 200-SMA; sells when price recovers above the 20-EMA.
 * 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in a straight-line melt-up it lags buy-and-hold; the gate
 * skips bottom-fishing in strong bears. Defensive pullback strategy, not a chaser.
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
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr;
  if (price < keltnerLow && rsi < 40 && price > sma200 && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
