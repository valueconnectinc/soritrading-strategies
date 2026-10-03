/*
 * @coinsori-strategy v1
 * name: ADA Keltner MR 4H Trend-Gated
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same validated ATR-adaptive Keltner mean-reversion recipe as
 * the ungated version, but with a 200-bar SMA regime gate so it only buys pullbacks
 * inside a confirmed uptrend. The ledger showed the ungated Keltner on SOL/XRP/ADA
 * has 22-40% drawdown because it stays invested in volatile alts; the gate is meant
 * to cut that drawdown by skipping knife-catching entries in confirmed downtrends.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with
 * RSI(14)<40 AND price is above the rising 200-bar average; sells when price closes
 * back above the 20-EMA (channel mid). A 2-bar cooldown after any trade cuts whipsaw.
 * When it does NOT work: in a straight-line melt-up it sits in cash and lags
 * buy-and-hold; in a choppy bear the gate keeps it flat (defensive, no return). It
 * is a defensive pullback strategy, not a momentum chaser.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null || sma200 == null || sma200prev == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Exit once price recovers above the 20-EMA (channel mid).
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const uptrend = price > sma200 && sma200 > sma200prev; // confirmed uptrend only
  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  if (uptrend && price < keltnerLow && rsi < 40 && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
