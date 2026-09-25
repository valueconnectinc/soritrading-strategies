/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride ATR Trail 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: a pure trend-following ride with an ATR trailing stop —
 * a genuinely different family from the mean-reversion champion. It enters on
 * a confirmed uptrend (fast EMA above slow EMA) and lets winners run by
 * trailing the stop behind price, cutting losers fast with a hard ATR stop.
 * When it buys: fast EMA9 crosses above slow EMA21 AND price is above the
 * slow EMA50 (higher-timeframe uptrend proxy). It exits when price closes
 * below the ATR trailing stop (set at 3x ATR below the highest close since
 * entry), or on a hard 3x ATR stop from entry.
 * When it does NOT work: in a choppy sideways range the EMA cross whipsaws
 * and the trailing stop gets hit repeatedly (many small losses); and it
 * re-enters late after a sharp V-reversal, missing the very bottom.
 */
function onUpdate(ctx) {
  const e9 = ctx.ema(9, 1);
  const e21 = ctx.ema(21, 1);
  const e50 = ctx.ema(50, 1);
  const atr = ctx.atr(14, 1);
  if (e9 == null || e21 == null || e50 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const st = ctx.state || {};

  if (pos > 0) {
    // hard stop: 3x ATR below entry
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // ATR trailing stop: ratchet up to 3x ATR below the highest close since entry
    const hi = st.hi != null ? Math.max(st.hi, price) : price;
    st.hi = hi;
    ctx.state = st;
    const trail = hi - atr * 3;
    if (price <= trail) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: confirmed uptrend (EMA9 above EMA21) AND price above the slow EMA50
  if (e9 > e21 && price > e50) {
    st.hi = price;
    ctx.state = st;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
