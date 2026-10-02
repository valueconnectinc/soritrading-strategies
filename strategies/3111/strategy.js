/*
 * @coinsori-strategy v1
 * name: BTC 1D Defensive Mean Reversion
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: In a confirmed uptrend, sharp panic dips to the lower
 * Bollinger band with an oversold RSI tend to snap back up. Buying these
 * flushes and selling the rebound captures mean reversion while a 200-day
 * trend gate keeps us out of prolonged bear markets.
 * When it buys and sells: It buys when price is above the 200-day average,
 * touches the lower Bollinger band (20, 2) AND RSI(14) is below 30. It sells
 * when price snaps back above the mid band (20-day average) or after a few
 * days. It holds cash during downtrends and melt-up runs with no dips.
 * When it does NOT work: It lags straight-line melt-ups because it only buys
 * dips, and a persistent crash can still carry a bought dip lower. It is a
 * long-only defensive strategy, not a crash profiteer and not a momentum rider.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const st = ctx.state;
  const ema20 = ctx.ema(20, 1);

  if (pos > 0) {
    // Exit: snap-back to mid band, or time stop after 6 days.
    if (ema20 != null && price > ema20) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    if (st.barsIn != null && ctx.i - st.barsIn >= 6) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  // Trend gate: only buy when price is above the 200-day average.
  if (price <= sma200) return null;

  // Entry: touch lower Bollinger band AND RSI deeply oversold.
  if (price <= bb.lower && rsi < 30) {
    st.barsIn = ctx.i;
    st.cd = null;
    // Risk 1% of equity per trade, sized by ATR, capped at 90% of cash.
    const atr = ctx.atr(14, 1);
    if (atr == null || atr <= 0) return null;
    const qty = Math.min((0.01 * ctx.cash) / atr, (ctx.cash / price) * 0.9);
    return { side: 'buy', qty };
  }
  return null;
}
