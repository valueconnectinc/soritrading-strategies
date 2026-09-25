/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid VolTargeted + VolGate
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The vol-targeted regime-switch hybrid champion (2528) beats
 * buy-and-hold on every window but its documented weakness is still high drawdown
 * (up to 39% on BTC, more on alts) because the trend leg keeps buying pullbacks
 * even into a blow-off melt-up top (extreme volatility), then rides the crash all
 * the way down to the 50-EMA. This variant adds ONE conservative regime filter:
 * it refuses trend-leg entries when volatility (ATR/price) is in the extreme top
 * range — those are exactly the blow-off tops where trend entries lose the most.
 * Everything else (entries, exits, vol-targeted sizing) is unchanged from 2528.
 * When it buys and sells: identical to 2528 — bear regime buys panic bottoms
 * (fear<40 + lower Bollinger break, mid-band exit); bull regime buys pullbacks to
 * the 20-EMA in a confirmed uptrend (exit below the 50-EMA) — but only if current
 * volatility is not extreme. Sizing stays vol-targeted (inverse ATR).
 * When it does NOT work: same as champion — sideways chop whipsaws the 50-EMA, and
 * a sharp V-reversal through the 50-EMA gives the trend leg no entry. The new vol
 * gate can also miss a genuine new trend that starts right after a volatile spike.
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
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    // hard stop: 3x ATR from entry (unchanged from champion)
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Volatility-targeted position size (unchanged from 2528): a 1-ATR adverse move
  // should cost about 1.5% of equity.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  // NEW regime gate: current volatility as a fraction of price. On BTC 4h this is
  // normally ~2-6%. Above 9% is a blow-off/panic spike — trend pullback entries
  // there are catching the top of a melt-up, the worst drawdown source. Skip them.
  // This threshold is a regime filter, not tuned to any single window.
  const volPct = atr / price;
  const extremeVol = volPct > 0.09;

  if (bull && !extremeVol) {
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
