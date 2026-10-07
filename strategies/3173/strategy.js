/*
 * @coinsori-strategy v1
 * name: BTC RSI2 Panic Reversion 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: When RSI(2) drops below 10, BTC is in an extreme short-term
 * panic that historically bounces back within days. Buying these rare, deep
 * oversold moments when the long-term trend is still up gives a high win-rate
 * contrarian entry with a built-in stop (the 200-day trend gate).
 * When it buys and sells: Buys when RSI(2) < 10 AND price above its 200-day
 * SMA (only catch panics inside an uptrend). Sells when RSI(2) recovers above
 * 50 OR after 10 days OR price breaks the 200-day SMA (trend is gone).
 * When it does NOT work: In a real bear market the 200-day gate keeps it out,
 * but the few times it does enter and the trend breaks, it holds a falling
 * knife. Long flat periods produce no trades at all (opportunity cost).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 200-day trend gate: only buy panic in a confirmed bull regime.
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const rsi2 = ctx.rsi(2, 1); // closed bar -> identical in backtest/live
  if (rsi2 == null) return null;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    const held = (st.entryBar != null) ? ctx.i - st.entryBar : 999;
    // Exit on recovery (rsi2 > 50), time stop (10 days), or trend break.
    if (rsi2 > 50 || held >= 10 || price < sma200) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rsi2 < 10 && price > sma200 && cd === 0) {
    st.entryBar = ctx.i;
    ctx.state.cd = 5;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
