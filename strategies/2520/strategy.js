/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid + Vol-Scaled Sizing
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated regime-switch hybrid (fear-contrarian in bear
 * regimes + selective trend leg in bull regimes) beats buy-and-hold on every
 * walk-forward window, but its drawdown is high (33-51%). This version adds
 * volatility-scaled position sizing: when ATR/price is elevated we size down,
 * which should cut drawdown while keeping the edge. A general risk rule, not a
 * curve-fit.
 * When it buys: same as the champion — panic-bottom in bear (fear<40 + lower
 * Bollinger break, exit at mid band); 20-EMA pullback in confirmed bull (exit
 * below 50-EMA). Position size shrinks as volatility rises.
 * When it does NOT work: sideways chop whipsaws the 50-EMA; and a V-reversal
 * that drops straight through the 50-EMA gives the trend leg no pullback entry.
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
      // bull regime: trend exit — drop back below 50-EMA
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Volatility-scaled size: full at calm (atrPct<=0.02), down to 35% at high vol.
  // High volatility = wider stops and bigger adverse moves, so we risk less.
  const atrPct = atr / price;
  const sizeFrac = atrPct <= 0.02 ? 0.99 : Math.max(0.35, 0.99 - (atrPct - 0.02) * 40);

  if (bull) {
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      return { side: 'buy', qty: ctx.cash / ctx.price * sizeFrac };
    }
    return null;
  }

  // bear regime: validated panic-bottom contrarian entry
  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * sizeFrac };
  }

  return null;
}
