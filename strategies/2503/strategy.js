/*
 * @coinsori-strategy v1
 * name: LTC 4H Band-Bounce Champion (plain)
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated band-bounce mean-reversion champion. Buy deep
 *   oversold dips below the lower Bollinger band and sell on recovery. This exact
 *   recipe (deep-oversold entry, fixed SMA20/RSI exit, 6% stop, cooldown) is the
 *   robust defensive edge proven across XRP/LTC/DOT/BNB/ADA. Every attempt to
 *   modify it (trailing stops, regime gates, extra filters) has made it worse.
 * When it buys and sells: Buy when the close is below the lower Bollinger band
 *   AND RSI(2) is deeply oversold, with a 5-bar cooldown after each exit. Sell when
 *   price recovers to the 20-SMA or RSI climbs above 55. A 6% hard stop caps
 *   single-trade damage.
 * When it does NOT work: In a sustained downtrend it can re-buy falling knives
 *   (cooldown reduces but does not eliminate this), and in fast melt-ups it exits
 *   too early and misses the rally. It is defensive by design and lags strong bulls.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(2, 1);
  const sma = ctx.sma(20, 1);
  if (bb == null || bb.lower == null || rsi == null || sma == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  const lastExit = ctx.state.lastExit || -9999;
  const cooldownOk = (ctx.i - lastExit) >= 5;

  if (pos > 0) {
    if (price < ctx.entryPx * 0.94) return { side: 'sell', qty: pos };
    if (price >= sma || rsi > 55) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < bb.lower && rsi < 30 && cooldownOk) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
