/*
 * @coinsori-strategy v1
 * name: Champion + FedRegime Gate BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated champion (fear-contrarian bear leg + trend pullback
 * leg) is locally optimal on price/volume/fear data. This adds a genuinely different
 * axis — the fed funds rate as a macro regime gate. When rates are high and rising
 * (tight policy) crypto is structurally risk-off, so the champion's aggressive
 * trend-buying is gated down; when rates are low/falling (easy policy) the trend leg
 * is allowed full size. This tests whether an interest-rate regime filter adds value
 * on top of the validated core.
 * When it buys and sells: identical to the champion (panic-bottom bear buys, 20-EMA
 * pullback bull buys, mid-band/50-EMA exits, 3x ATR stop) but the trend-leg position
 * is scaled to 60% when the fed rate is high (>4%) and full size when it is low.
 * When it does NOT work: if fed data does not align to bars (tsUnit unknown) the gate
 * may be constant or misaligned and add nothing; sideways chop still whipsaws the
 * 50-EMA; mega-bull melt-ups still outrun the early exits.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  const fed = ctx.data('fed');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null || fed == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;
  // High fed rate = tight policy = risk-off: gate the trend leg to 60% size.
  const tightPolicy = fed > 4.0;

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
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) {
      // Fed gate: cut trend-leg size under tight policy.
      if (tightPolicy) qty = qty * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && price < bb.lower) return { side: 'buy', qty: qty };

  return null;
}
