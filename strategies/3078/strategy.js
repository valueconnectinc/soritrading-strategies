/*
 * @coinsori-strategy v1
 * name: Upbit BTC 1D Defensive Mean-Reversion
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: In sideways or falling markets, sharp drops are often
 * overreactions that snap back. Buying after a big drop and selling when the
 * price recovers to its average can profit while staying out of violent trends.
 * When it buys and sells: It buys when the price dips far below its 20-day
 * average (oversold) but only when the market is not in a steep collapse. It
 * sells when the price climbs back to the average, or after a few days if the
 * drop keeps going.
 * When it does NOT work: In a strong one-way crash, "oversold" keeps getting
 * more oversold and every dip-buy loses. It also misses big rallies because it
 * only buys weakness.
 */
function onUpdate(ctx) {
  // Bollinger(20, 2) gives the mean and the lower band.
  const bb = ctx.bb(20, 2, 1);
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  // Slow trend guard: 100-day SMA. Below it we only buy if the drop is extreme.
  const sma100 = ctx.sma(100, 1);
  if (sma100 == null) return null;

  const px = ctx.price;
  const pos = ctx.position || 0;
  // Track entry bar so we can time-limit a losing dip-buy.
  const entryBar = ctx.state.entryBar || 0;

  if (pos === 0) {
    // Oversold: price below the lower Bollinger band (a sharp drop).
    const oversold = px < bb.lower;
    // Trend guard: only buy when not in a deep collapse below the 100-day avg.
    const deepGuard = px < sma100 ? px < bb.mid - (bb.mid - bb.lower) * 1.5 : true;
    if (oversold && deepGuard) {
      const atr = ctx.atr(14, 1);
      if (atr == null) return null;
      const stopDist = atr * 3;
      if (stopDist <= 0) return null;
      const qty = Math.min((ctx.cash * 0.02) / stopDist, (ctx.cash / px) * 0.9);
      if (qty <= 0) return null;
      return { side: 'buy', qty: qty, state: { entryBar: ctx.i } };
    }
    return null;
  }

  // Exit: revert to the mean (price back above the middle band) = take profit.
  if (px >= bb.mid) {
    return { side: 'sell', qty: pos };
  }
  // Safety stop: if price keeps falling far below entry, cut the loss.
  const atr = ctx.atr(14, 1);
  if (atr != null && px < ctx.entryPx - atr * 3) {
    return { side: 'sell', qty: pos };
  }
  // Time stop: don't hold a losing dip-buy forever; exit after 20 days.
  if (ctx.i - entryBar >= 20) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
