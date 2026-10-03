/*
 * @coinsori-strategy v1
 * name: ADA Keltner MR 1D Trend-Gated
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe is the most robust
 * edge in this environment, and daily bars give the lowest drawdown. This applies the
 * recipe to ADA on 1d with the 200-SMA trend gate — a new (asset, timeframe) data point.
 * The ungated ADA 1d was already validated at +361%/MDD15; this checks whether the gate
 * (which halved drawdown on 4h) also helps daily.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with
 * RSI(14)<40 AND price above the 200-SMA (uptrend only); sells when price recovers
 * above the 20-EMA. 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in a straight-line melt-up it sits in cash and lags buy-and-hold;
 * the 200-SMA gate keeps it out of strong bear rallies, so it misses bottom-fishing in
 * a crash. Defensive pullback strategy, not a chaser.
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
    // Exit once price recovers above the 20-EMA (channel mid). No hard stop:
    // the mid-band exit is what makes this recipe work.
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  // 200-SMA trend gate: only buy pullbacks in an uptrend, to avoid bear-market knives
  if (price < keltnerLow && rsi < 40 && price > sma200 && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
