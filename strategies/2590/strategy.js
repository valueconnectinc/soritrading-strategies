/*
 * @coinsori-strategy v1
 * name: OnChain Addr-Growth Gate Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The proven defensive-Donchian trend family, but with a
 * NEW independent regime signal — on-chain active-address growth. When the
 * BTC network's active addresses are above their 30-day average, the network
 * is growing (healthy bull), so we hold through normal pullbacks with a wider
 * exit stop; when addresses contract, we use the tight 30-day exit. This is a
 * different data source from the fed gate, so it tests whether on-chain health
 * can time trend-following exits.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep
 * downtrend), sized by inverse volatility; exits on a 30-day low, or a 60-day
 * low when active-address growth confirms a healthy bull, or a 3x-ATR stop.
 * When it does NOT work: depends on the 'addr' dataset being served by the
 * user's agent (falls back to the tight 30-day exit if unavailable); on-chain
 * data is slow-moving and may not time daily exits well (prior hashrate
 * attempts failed on this).
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  // On-chain regime: active addresses above their 30-day average = growing network.
  // ctx.data('addr') needs user's agent; if null we default to tight exit (safe).
  const addr = ctx.data('addr');
  const addrSma = ctx.data('addr_sma30');
  let growing = false;
  if (addr != null && addrSma != null && addrSma > 0) {
    growing = addr > addrSma * 1.0;
  }

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // Wider 60-day exit when the network is growing (healthy bull), else tight 30-day.
    const exitLow = growing ? ctx.low(60, 1) : ll30;
    if (exitLow != null && price < exitLow) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    const volRatio = atr / price;
    const size = Math.min(0.99, Math.max(0.25, 0.03 / volRatio));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
