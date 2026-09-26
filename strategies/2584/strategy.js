/*
 * @coinsori-strategy v1
 * name: Defensive Chandelier Trend ETH 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed champion (fed-gated defensive Donchian) uses a
 * donchian-low exit. This isolates the exit mechanism: a chandelier trailing stop
 * (highest-high since entry minus N x ATR) is a well-known way to ride trends while
 * cutting losses, and it is genuinely different from the champion's price-low exit.
 * Bet: a trailing-ATR stop can hold through normal bull pullbacks and still bail on
 * real reversals, possibly with a better risk/reward than a fixed lookback low.
 * When it buys and sells: buys a 55-day-high breakout when not in a steep EMA50
 * downtrend, sizes by inverse volatility. Exits when price falls below the trailing
 * chandelier stop (running highest-high since entry minus 3x ATR) or a 3x-ATR
 * disaster stop below entry.
 * When it does NOT work: in choppy sideways markets the 3x-ATR chandelier may give
 * back more than a tighter low-based exit, and in a violent crash the trailing stop
 * lags the actual top. This is a pure-price strategy; no macro or sentiment data.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const st = ctx.state || {};

  if (pos > 0) {
    // Update running highest-high since entry, then chandelier stop = max - 3x ATR.
    const hh = st.hh != null ? Math.max(st.hh, price) : price;
    const stop = hh - atr * 3;
    st.hh = hh;
    // Disaster stop: 3x ATR below entry.
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    st.hh = price; // reset trailing high on new entry
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
