/*
 * @coinsori-strategy v1
 * name: FearGreed Multi-Asset Momentum Rotation
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The single-symbol champion v2 (confirmed optimal) uses fear-greed
 * to buy panic bottoms on ONE asset. This is a different family: a MULTI-ASSET rotation
 * that uses the same fear-greed edge but diversifies across BTC/SOL/ETH, always holding
 * the asset with the strongest trend momentum while the fear-greed regime is not extreme.
 * When fear-greed turns extreme, we cut to cash to avoid the crash.
 * When it buys and sells: each symbol independently computes a momentum score (how far
 * price is above its 50-EMA, plus the 20-EMA slope). If the regime is not extreme fear
 * (fg>20) and the asset's momentum is strong, we hold it; if fear crashes (fg<20) we
 * de-risk and if fg<10 we go to cash. The rotation naturally shifts capital toward the
 * strongest asset and away from weakening ones.
 * When it does NOT work: in a choppy sideways market where no asset has sustained
 * momentum, the rotation whipsaws between assets and pays fees. It also misses the
 * panic-bottom contrarian buys that the champion captures, because it requires momentum
 * rather than mean-reversion — so the biggest crash bounces are not traded.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fg');
  if (fg == null) return null;

  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  if (ema50 == null || ema20 == null || ema20p == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Momentum score: how strongly price is above the 50-EMA + the 20-EMA slope.
  // Higher = stronger trend. This is the rotation's ranking input.
  const above = (price - ema50) / ema50;
  const slope = (ema20 - ema20p) / ema20p;
  const score = above * 3 + slope * 10;

  // Extreme fear: cut to cash regardless of momentum (crash protection).
  if (fg < 10) {
    if (pos > 0) return { side: 'sell', qty: pos };
    return null;
  }

  // Mild fear (10-20): only hold very strong momentum, else de-risk.
  if (fg < 20) {
    if (pos > 0 && score < 0.02) return { side: 'sell', qty: pos };
    if (pos === 0 && score > 0.05) return { side: 'buy', qty: ctx.cash / price * 0.99 };
    return null;
  }

  // Normal regime: hold while momentum is positive, buy when it turns strongly positive.
  if (pos > 0) {
    if (score < 0) return { side: 'sell', qty: pos };
    return null;
  }
  if (score > 0.03) return { side: 'buy', qty: ctx.cash / price * 0.99 };
  return null;
}
