/*
 * @coinsori-strategy v1
 * name: Champion v2 Final (FearDepth TwoTier) - OOS 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Out-of-sample validation of the validated champion (fear-contrarian
 * bear leg + selective trend leg, two-tier fear-depth sizing) on a fresh 4h asset. The
 * champion was tuned on BTC/ETH 4h; confirming it on SOL 4h (never used for the two-tier
 * sizing) tests whether the fear-depth crash-defense edge generalizes at the native
 * interval. Earlier 1d generalization was mixed (missed mega-bulls), so this checks 4h.
 * When it buys and sells: bear regime buys panic bottoms (fear<40 + lower Bollinger
 * break, mid-band exit, 3x ATR stop); bull regime buys pullbacks to the 20-EMA in a
 * confirmed uptrend (exit below 50-EMA). Two-tier sizing: deep fear (fg<20) cuts size
 * to 70%, capitulation (fg<10) to 50%.
 * When it does NOT work: sideways chop whipsaws the 50-EMA; sharp V-reversals give the
 * trend leg no entry; extreme-fear bottoms that keep falling hit the size cut.
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

  if (fg < 40 && price < bb.lower) return { side: 'buy', qty: qty };

  return null;
}
