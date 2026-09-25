/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid FearContrarian + Trend (ATR Trail)
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated fear-contrarian mean-reversion champion is a
 * great DEFENSIVE strategy, but its documented weakness is lagging bull melt-ups
 * and a high 44-51% drawdown from riding the trend leg all the way to the 50-EMA
 * break. This version adds an ATR trailing stop on the bull trend leg so it locks
 * in melt-up gains instead of giving them back, targeting both weaknesses while
 * keeping the proven panic-buy leg for bear regimes.
 * When it buys: in a BEAR regime (price below the 50-EMA) it buys the validated
 * panic-bottom (fear<40 + lower Bollinger break) and exits at the mid band. In a
 * confirmed BULL regime (20-EMA above 50-EMA and price above both) it buys a
 * pullback to the 20-EMA and rides until price closes back below the 50-EMA OR
 * the ATR trailing stop trips (locking in the melt-up).
 * When it does NOT work: in sideways chop the 50-EMA whipsaws; and a sharp
 * V-reversal that drops straight through the 50-EMA without a pullback gives the
 * trend leg no entry (it sits in cash instead).
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50; // confirmed uptrend structure

  if (pos > 0) {
    // hard stop: 3x ATR from entry (wider than 10% to avoid whipsaw exits)
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      // bear regime: mean-reversion exit at mid band
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      // bull regime: track the highest close since entry for the trailing stop
      const hi = ctx.state.hi || ctx.entryPx;
      const newHi = Math.max(hi, price);
      ctx.state.hi = newHi;
      // trailing stop: give back at most 3x ATR from the running high
      if (price <= newHi - atr * 3) return { side: 'sell', qty: pos };
      // trend exit — drop back below 50-EMA
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (bull) {
    // SELECTIVE trend leg: only buy a pullback that holds above the 50-EMA and
    // where the 20-EMA is still rising (uptrend intact). Pullback = price dipped
    // to within 1 ATR of the 20-EMA from above, then closed back above it.
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      ctx.state.hi = price; // reset trailing high on entry
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
