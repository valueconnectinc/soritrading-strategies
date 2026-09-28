/*
 * @coinsori-strategy v1
 * name: BTC 1D Defensive Bollinger-RSI + Trend Ride
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC is volatile but trends up over years. Buying only at
 * deep oversold flushes while the long-term 200-day average is still rising means
 * we buy fear at a discount inside a healthy uptrend — and we are out of the
 * market the rest of the time, so drawdown stays small. This version uses an
 * ATR-adaptive oversold line (SMA20 minus 2.5 ATRs) instead of a fixed Bollinger
 * band, so the entry adapts to the actual volatility regime rather than a fixed
 * 2-sigma width. In a confirmed strong bull we allow a slightly milder oversold
 * entry (RSI<40) because deep RSI<30 flushes are rare during melt-ups.
 * When it buys and sells: Buys when price closes below the ATR-adaptive oversold
 * line and RSI is oversold (below 30 normally, below 40 in a confirmed strong
 * uptrend) while price is above a rising 200-day average, using nearly full cash.
 * In a strong trend it rides until price breaks its 10-day low; otherwise it
 * sells on the snap-back above the 20-day mid line or when RSI climbs above 60.
 * When it does NOT work: It systematically misses straight-line melt-ups — it
 * sits in cash while BTC rallies without a pullback, so it badly lags buy-and-hold
 * in relentless bull markets. It is a defensive, capital-preserving strategy, not
 * a melt-up capture machine.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const sma20 = ctx.sma(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || sma200prev == null || sma20 == null || atr == null || rsi == null) return null;

  // Regime: rising 200-day average = healthy long-term uptrend.
  const uptrend = sma200 > sma200prev;
  // Strong trend = price well above the 200-day line -> let winners ride.
  const strongTrend = price > sma200 * 1.05;
  // ATR-adaptive oversold line: 2.5 ATRs below the 20-day mid. Adapts the entry
  // to volatility (wider in high-vol, tighter in low-vol) better than a fixed
  // 2-sigma Bollinger band, per the ledger's cross-asset findings.
  const lowerLine = sma20 - 2.5 * atr;

  const st = ctx.state;
  if (pos > 0) {
    if (strongTrend) {
      // Ride with a 10-day-low trailing stop in strong trends.
      const low10 = ctx.low(10, 1);
      if (low10 != null && price < low10) {
        st.cd = ctx.i + 3;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Chop/bear: take the snap-back profit above the mid line or RSI>60.
    if (price > sma20 || rsi > 60) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  // Entry: oversold flush inside a rising long-term uptrend. In a strong bull we
  // use a milder RSI<40 bar because deep RSI<30 flushes are rare during melt-ups.
  const rsiBar = strongTrend ? 40 : 30;
  if (uptrend && price < lowerLine && rsi < rsiBar) {
    st.cd = null;
    // Entries are rare, so commit nearly full cash to make the trade count.
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
