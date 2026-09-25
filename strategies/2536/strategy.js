/*
 * @coinsori-strategy v1
 * name: FearGreed Momentum Rotation v2
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Multi-asset rotation using fear-greed to gate risk and a strict
 * momentum rule to pick the strongest asset. v1 whipsawed catastrophically (1600+
 * trades, -100%) because the momentum threshold was far too loose. v2 requires a
 * strong, confirmed uptrend (price well above the 50-EMA AND 20-EMA above 50-EMA) and
 * only exits when the trend clearly breaks — far fewer trades.
 * When it buys and sells: buy only when price is >5% above the 50-EMA and the 20-EMA
 * is above the 50-EMA (confirmed uptrend) and fear-greed is not extreme. Exit when
 * price falls below the 50-EMA or fear-greed crashes below 10. Holds the trend instead
 * of churning on every wiggle.
 * When it does NOT work: a V-reversal through the 50-EMA (no sustained uptrend) gives
 * no entry and misses the whole move; and a grinding sideways market whipsaws the
 * 50-EMA exit. It also does not buy panic bottoms — it requires momentum, so the
 * biggest crash bounces are not traded.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  if (fg == null) return null;

  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  if (ema50 == null || ema20 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Extreme fear: go to cash regardless (crash protection).
  if (fg < 10) {
    if (pos > 0) return { side: 'sell', qty: pos };
    return null;
  }

  // Confirmed uptrend: 20-EMA above 50-EMA AND price meaningfully above the 50-EMA.
  const uptrend = ema20 > ema50 && price > ema50 * 1.05;

  if (pos > 0) {
    // Exit when the trend breaks (price back below the 50-EMA).
    if (price < ema50) return { side: 'sell', qty: pos };
    return null;
  }
  if (uptrend) return { side: 'buy', qty: ctx.cash / price * 0.99 };
  return null;
}
