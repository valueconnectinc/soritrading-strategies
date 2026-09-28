/*
 * @coinsori-strategy v1
 * name: BTC 1D Defensive Bollinger-RSI + Trend Ride (Vol-Scaled)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC is volatile but trends up over years. Buying only at
 * deep oversold flushes (below the lower Bollinger band with RSI below 30) while
 * the long-term 200-day average is still rising means we buy fear at a discount
 * inside a healthy uptrend — and we are out of the market the rest of the time,
 * so drawdown stays small. In a confirmed strong bull we allow a slightly milder
 * oversold entry (RSI<40) because deep RSI<30 flushes are rare during melt-ups.
 * This version adds ATR-based position sizing: in genuinely extreme volatility we
 * commit a bit less cash, because an oversold flush in a violent regime is more
 * likely to keep falling. The sizing is deliberately gentle so it trims the worst
 * drawdowns without giving away most of the return.
 * When it buys and sells: Buys when price is below the lower Bollinger band and
 * RSI is oversold (below 30 normally, below 40 in a confirmed strong uptrend)
 * while price is above a rising 200-day average, sizing down only in extreme
 * volatility. In a strong trend it rides until price breaks its 10-day low;
 * otherwise it sells on the snap-back above the mid band or when RSI climbs above 60.
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
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || sma200prev == null || bb == null || rsi == null) return null;

  // Regime: rising 200-day average = healthy long-term uptrend.
  const uptrend = sma200 > sma200prev;
  // Strong trend = price well above the 200-day line -> let winners ride.
  const strongTrend = price > sma200 * 1.05;

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
    // Chop/bear: take the snap-back profit above the mid band or RSI>60.
    if (price > bb.mid || rsi > 60) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  // Entry: oversold flush inside a rising long-term uptrend. In a strong bull we
  // use a milder RSI<40 bar because deep RSI<30 flushes are rare during melt-ups.
  const rsiBar = strongTrend ? 40 : 30;
  if (uptrend && price < bb.lower && rsi < rsiBar) {
    st.cd = null;
    // Gentle ATR sizing: only in extreme volatility (ATR/price > 6%) do we cut to
    // 75%; between 4.5% and 6% we trim to 90%. Below that, full 95%. This trims
    // the rare violent falling-knife cases without giving away normal returns.
    const atr = ctx.atr(14, 1);
    let sizeFrac = 0.95;
    if (atr != null) {
      const atrPct = atr / price;
      if (atrPct > 0.06) sizeFrac = 0.75;
      else if (atrPct > 0.045) sizeFrac = 0.90;
    }
    return { side: 'buy', qty: (ctx.cash / price) * sizeFrac };
  }
  return null;
}
