/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid FearContrarian + Trend
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated fear-contrarian mean-reversion champion is a
 * great DEFENSIVE strategy (crushes bear markets) but its documented weakness is
 * lagging bull melt-ups (BTC W1 +84% vs buy-and-hold +1599%). This hybrid adds a
 * trend-following leg that only operates in bull regimes, targeting that exact
 * weakness while keeping the proven panic-buy leg for bear regimes.
 * When it buys: in a BEAR regime (price below the 50-EMA) it buys the validated
 * panic-bottom (fear<40 + lower Bollinger break) and exits at the mid band. In a
 * BULL regime (price above the 50-EMA) it buys pullbacks toward the 20-EMA and
 * rides the trend until price closes back below the 50-EMA.
 * When it does NOT work: in a sideways chop that straddles the 50-EMA the two legs
 * can whipsaw; and the trend leg can give back gains in a sharp V-reversal that
 * drops straight through the 50-EMA without a pullback to buy.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = price > ema50; // regime gate: above 50-EMA = trend regime

  if (pos > 0) {
    // hard stop protects both legs
    if (price <= ctx.entryPx * 0.90) return { side: 'sell', qty: pos };
    if (!bull) {
      // bear regime: mean-reversion exit at mid band
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      // bull regime: trend exit — drop back below 50-EMA
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (bull) {
    // trend leg: buy pullback to 20-EMA in an uptrend
    const prevEma20 = ctx.ema(20, 2);
    if (prevEma20 == null) return null;
    if (price <= ema20 * 1.01 && price > ema50) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // bear regime: validated panic-bottom contrarian entry
  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
