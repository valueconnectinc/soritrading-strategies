/*
 * @coinsori-strategy v1
 * name: FearGreed Euphoria Short BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated champion only goes long on fear and sits in cash
 * during greed, so it misses (but also avoids) melt-ups. This is the REVERSE family:
 * short the euphoria. When fear-greed is extremely high and price is extended above
 * the trend, crowd euphoria is a contrarian top signal — short and cover on the fade.
 * When it buys and sells: short when fg>85 AND price is extended >1 ATR above the
 * 20-EMA; cover when fg falls below 70, price crosses back below the 20-EMA, or a
 * 3x ATR stop is hit.
 * When it does NOT work: a genuine sustained melt-up (no fade) keeps rallying past
 * the stop, and whipsaw around the top churns. BTC 4h momentum evidence says extended
 * entries are punished, so this may fail — that is the honest hypothesis being tested.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (ema20 == null || atr == null || fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // pos < 0 means we are short (negative position)
  if (pos < 0) {
    // cover on stop, greed fade, or trend break
    if (price >= ctx.entryPx + atr * 3) return { side: 'buy', qty: -pos };
    if (fg < 70) return { side: 'buy', qty: -pos };
    if (price < ema20) return { side: 'buy', qty: -pos };
    return null;
  }

  // only short when flat
  if (pos > 0) return null;

  // euphoria: extreme greed + price extended above trend
  if (fg > 85 && price > ema20 + atr * 1.0) {
    const qty = (ctx.cash / price) * 0.5; // half-size, shorting is risky
    return { side: 'sell', qty: qty };
  }
  return null;
}
