/*
 * @coinsori-strategy v1
 * name: SOL-XRP 1D Defensive MR Basket
 * ex: binance
 * syms: SOLUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The single-asset defensive mean-reversion champion is validated
 * but lags melt-ups because one asset rarely has a deep dip to buy while it is rallying.
 * Running the same recipe on TWO assets (SOL + XRP) with shared equity means that when
 * one melts up, the other is often pulling back to buy — diversifying away the
 * single-asset lag while keeping the low-drawdown defensive profile.
 * When it buys and sells: on each asset, buy only when price closes below the lower
 * Bollinger (20,2) with RSI<30 while the 200-day average is still rising; sell when price
 * recovers above the 20-day average or the long-term trend rolls over. Each leg is capped
 * at 50% of equity so the two never double the risk.
 * When it does NOT work: in a broad coordinated crypto bear both rising-trend gates stay
 * flat (capital safe, but little upside); a single straight-line melt-up of both assets at
 * once still leaves it mostly in cash. It is defensive, not a momentum winner.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null) return null;

  const pos = ctx.pos(sym);

  if (pos > 0) {
    // Exit: recovered above the 20-day average, or the long-term trend rolled over.
    if (price > ema20 || price < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Buy only a deep oversold flush inside a rising long-term trend.
  if (sma200 > sma200prev && rsi < 30 && price < bb.lower) {
    // Cap each leg at 50% of equity so the two legs never double up the risk.
    const maxQty = (ctx.cash / price) * 0.50;
    if (maxQty <= 0) return null;
    return { side: 'buy', qty: maxQty };
  }
  return null;
}
