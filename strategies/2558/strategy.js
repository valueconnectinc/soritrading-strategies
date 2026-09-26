/*
 * @coinsori-strategy v1
 * name: Champion v2 + MeltUp Breakout Leg
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated champion v2's one documented, consistent weakness
 * across every OOS asset is that it LAGS extreme melt-ups — its trend leg only buys
 * pullbacks to the 20-EMA, which rarely fire when price runs away in a strong bull.
 * This version adds a breakout-continuation leg to the trend side: in a confirmed
 * uptrend, if price closes above the highest high of the last 20 bars (a melt-up
 * breakout), buy on strength instead of waiting for a pullback. This targets the
 * lag directly while keeping the defensive bear leg intact.
 * When it buys and sells: bear regime buys panic bottoms (fear<40 + lower Bollinger
 * break, mid-band exit, 3x ATR hard stop); bull regime buys pullbacks to the 20-EMA
 * OR a fresh 20-bar-high breakout (exit below the 50-EMA, 3x ATR hard stop).
 * Position is volatility-targeted so a 1-ATR adverse move costs ~1.5% of equity.
 * When it does NOT work: sideways chop whipsaws the 50-EMA and fires false breakouts;
 * a sharp V-reversal straight through the 50-EMA kills the trend leg. Breakout entries
 * add fees and can buy a local top right before a pullback.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const hi20 = ctx.high(20, 1); // highest high of last 20 closed bars
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (hi20 == null || fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  let qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (bull) {
    // Pullback entry (original)
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      return { side: 'buy', qty: qty };
    }
    // Melt-up breakout entry: close above the 20-bar high AND price strongly above
    // the 20-EMA (> 1 ATR) — confirms real strength, not a chop breakout.
    const strong = price > ema20 + atr * 1.0;
    if (price > hi20 && strong) {
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
