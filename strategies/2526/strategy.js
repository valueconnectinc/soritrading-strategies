/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride ATR Trail 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: trend-following ride with a WIDE ATR trailing stop.
 * Previous version used a 3x ATR trail with a fast EMA9/21 cross and bled out
 * on 300+ whipsaw trades. This version uses a slower EMA20/50 entry (far fewer
 * signals) and a much wider 7x ATR trail so winners run and losers are cut
 * without constant stop-outs.
 * When it buys: EMA20 crosses above EMA50 AND price above EMA100 (strong
 * higher-timeframe uptrend proxy). Exits when price closes below the 7x ATR
 * trailing stop (below the highest close since entry) or a 7x ATR hard stop.
 * When it does NOT work: in a long choppy range the EMA20/50 cross still
 * whipsaws occasionally, and the wide trail gives back a big chunk of any
 * peak before exiting — poor in mean-reverting, range-bound markets.
 */
function onUpdate(ctx) {
  const e20 = ctx.ema(20, 1);
  const e50 = ctx.ema(50, 1);
  const e100 = ctx.ema(100, 1);
  const atr = ctx.atr(14, 1);
  if (e20 == null || e50 == null || e100 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const st = ctx.state || {};

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 7) return { side: 'sell', qty: pos };
    const hi = st.hi != null ? Math.max(st.hi, price) : price;
    st.hi = hi;
    ctx.state = st;
    const trail = hi - atr * 7;
    if (price <= trail) return { side: 'sell', qty: pos };
    return null;
  }

  if (e20 > e50 && price > e100) {
    st.hi = price;
    ctx.state = st;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
