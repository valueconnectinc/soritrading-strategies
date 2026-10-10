/*
 * @coinsori-strategy v1
 * name: SOL Donchian Breakout Trend 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A classic breakout trend-follower. When price closes above the 20-day
 * high, momentum is starting; riding it with a wide ATR-trailing stop captures the sustained
 * bull runs that mean-reversion strategies miss. This is the opposite family of the RSI2
 * panic-dip champion (defensive MR) — it is meant to make money in the bulls that MR lags.
 * When it buys and sells: Buys when the daily close breaks above the highest high of the
 * previous 20 days. Sells when price falls below an ATR-trailing stop (2.5 ATR below the peak
 * close since entry) or closes below the 20-day low.
 * When it does NOT work: In a choppy sideways market breakouts whipsaw (buy the breakout,
 * stop out, repeat) and bleed fees. The wide trail gives back a large part of every peak in
 * fast reversals. No data before Aug 2020.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Donchian levels measured over the 20 bars BEFORE the last closed bar (ago=2), so the
  // breakout compares the last close against PRIOR highs — a close can then actually exceed it.
  const dnHigh = ctx.high(20, 2);   // highest high of the 20 closed bars before the last one
  const dnLow = ctx.low(20, 2);     // lowest low of the 20 closed bars before the last one
  const atr = ctx.atr(14, 1);
  const lastClose = ctx.closes.at(-2);
  if (dnHigh == null || dnLow == null || atr == null || atr <= 0 || lastClose == null) return null;

  const st = ctx.state;
  const pos = ctx.position;

  if (pos > 0) {
    // Track the peak close since entry so the trail anchors to the real high
    const peak = st.peak != null ? Math.max(st.peak, price) : price;
    st.peak = peak;
    const trail = peak - 2.5 * atr;  // 2.5 ATR of room: wide enough to survive normal pullbacks
    ctx.watch([{ side: 'sell', price: trail, trigger: 'below', note: 'ATR trail stop' }]);
    if (price < trail || lastClose < dnLow) {
      delete st.peak;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Classic 20-day breakout entry: last close above the prior 20-day high
  if (lastClose > dnHigh) {
    st.peak = price;
    const qty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: qty };
  }
  return null;
}
