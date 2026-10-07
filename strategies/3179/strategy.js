/*
 * @coinsori-strategy v1
 * name: BTC 200-Day Trend Rider 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The single most robust edge in BTC is the long-term trend.
 * The 200-day average cleanly separates bull from bear: when price is above it
 * the market tends to keep climbing, when below it tends to keep falling. A tiny
 * 5% hysteresis band avoids the whipsaw of crossing exactly at the line.
 * When it buys and sells: Buys when a CLOSED bar settles above 105% of the
 * 200-day average. Sells when a CLOSED bar settles below 95% of it. The band
 * means you only flip on a real 5% move, not on noise at the line.
 * When it does NOT work: In a long flat range the band keeps you in and out
 * repeatedly at small loss. It also gives back the 5% move before each exit
 * during a real bear, so it never tops exactly.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 200-day average on the CLOSED bar (ago=1 -> identical live/backtest).
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Hysteresis band: buy above 105%, sell below 95% of the 200-day.
  const upper = sma200 * 1.05;
  const lower = sma200 * 0.95;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if (price < lower) {
      ctx.state.cd = 10;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price > upper && cd === 0) {
    ctx.state.cd = 10;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
