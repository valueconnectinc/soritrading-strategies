/*
 * @coinsori-strategy v1
 * name: Pure Bollinger Bear-Leg No FearGreed BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Diagnostic to isolate whether the champion's recent
 * (2023-2026) -50% failures are caused by the fear-greed signal or by the
 * price-based logic itself. Removes ctx.data('fg') entirely and keeps only
 * the Bollinger lower-band panic-bottom buy + mid-band exit + ATR stop.
 * When it buys and sells: buys when close breaks below lower Bollinger(20,2)
 * in a non-bull regime, exits at the middle band or on a 3x ATR hard stop.
 * When it does NOT work: in strong melt-up regimes it stays flat and misses
 * the rally; this is a pure defensive bear-leg diagnostic.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price >= bb.mid) return { side: 'sell', qty: pos };
    return null;
  }

  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (!bull && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
