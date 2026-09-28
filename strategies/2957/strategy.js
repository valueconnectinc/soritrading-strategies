/*
 * @coinsori-strategy v1
 * name: ETH 1D Defensive Bollinger-RSI
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: same defensive mean-reversion recipe that is validated on
 * BTC 1D. ETH is higher-beta than BTC — it melts up harder and pulls back more
 * often — so the oversold-flush entries fire more frequently and the strategy can
 * capture more of the rally while keeping the low-drawdown defensive character.
 * Buying only at deep oversold flushes below the lower Bollinger band with RSI
 * below 30, while the 200-day average is still rising, means we buy fear at a
 * discount inside a healthy uptrend.
 * When it buys and sells: buy when price closes below the lower Bollinger band
 * with RSI below 30 while price is above a rising 200-day average, using nearly
 * full cash. Sell on the snap-back above the mid band or when RSI climbs above 60.
 * When it does NOT work: it sits in cash during straight-line melt-ups and lags
 * buy-and-hold; and ETH's higher volatility means deeper drawdowns than BTC in
 * violent bull corrections. It is defensive, not a melt-up capture machine.
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

  const uptrend = sma200 > sma200prev;

  if (pos > 0) {
    // take the snap-back profit above the mid band or when RSI turns up
    if (price > bb.mid || rsi > 60) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // defensive entry: oversold flush inside a rising long-term uptrend
  if (uptrend && price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
