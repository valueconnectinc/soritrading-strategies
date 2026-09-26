/*
 * @coinsori-strategy v1
 * name: Champion v2 BNB 1D Generalization
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Out-of-sample generalization test of the validated champion
 * (fear-contrarian bear leg + trend pullback leg with two-tier fear-depth sizing)
 * on BNB daily bars — an asset NEVER used for tuning. If the fear-depth crash-defense
 * edge is real and not fitted to BTC/ETH, it should transfer to BNB.
 * When it buys and sells: bear regime buys panic bottoms (fear<40 + lower Bollinger
 * break, mid-band exit, 3x ATR stop); bull regime buys pullbacks to the 20-EMA in a
 * confirmed uptrend. Position is volatility-targeted (~1.5% per 1-ATR move).
 * When it does NOT work: sideways chop whipsaws the 50-EMA; a sharp V-reversal gives
 * the trend leg no entry; extreme-fear bottoms that keep falling hit the 50% size cut.
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
