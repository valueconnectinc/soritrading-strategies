/*
 * @coinsori-strategy v1
 * name: Champion + FedRegime BearGate BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated champion's documented weakness is high drawdown on
 * the bear leg — buying panic bottoms (fear<40 + lower Bollinger break) in GENUINE
 * crashes that keep falling. This version uses the fed funds rate as a macro regime
 * gate on that bear leg: under tight policy (fed>4) a crash is more likely to keep
 * falling, so panic-bottom buys are cut to 50%; under easy policy (fed<=4) they keep
 * full size because recoveries are faster. The trend leg is untouched (it already
 * works). Tests whether an interest-rate regime filter reduces bear-leg drawdown.
 * When it buys and sells: identical to the champion (panic-bottom bear buys, 20-EMA
 * pullback bull buys, mid-band/50-EMA exits, 3x ATR stop) but the bear-leg position
 * is halved when the fed rate is high.
 * When it does NOT work: if fed data misaligns to 4h bars the gate is constant and
 * adds nothing; sideways chop still whipsaws the 50-EMA; mega-bull melt-ups still
 * outrun the early exits.
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
  // Tight policy (fed>4) = crashes more likely to keep falling: halve bear-leg size.
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
    if (nearEma20 && rising) return { side: 'buy', qty: qty };
    return null;
  }

  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;
  // Fed bear gate: halve panic-bottom size under tight policy.
  if (tightPolicy) qty = qty * 0.5;

  if (fg < 40 && price < bb.lower) return { side: 'buy', qty: qty };

  return null;
}
