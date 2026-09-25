/*
 * @coinsori-strategy v1
 * name: Champion + BounceConfirm BearLeg Entry
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The confirmed champion v2 buys bear-leg panic bottoms the instant
 * price breaks below the lower Bollinger band — i.e. it catches the falling knife. Its
 * weakest window (BTC W2) has 40% MDD from positions that keep falling many bars before
 * recovering to the mid-band. This variant keeps exits and fear-depth sizing identical
 * but changes the bear-leg ENTRY to require a bounce confirmation: only buy after price
 * dipped below the lower band and then closed back above it, while still in fear. This
 * reduces entries (opposite of the failed time-stop, which added trades) and skips the
 * deepest knife drops.
 * When it buys and sells: exits identical to champion (bear: mid-band, bull: below
 * 50-EMA, 3x ATR stop). Bull-leg pullback buys identical. Bear leg: buy only when
 * fg<40 AND price closed below the lower band last bar AND closed back above it now
 * (confirmed bounce off the band), scaled by fear depth.
 * When it does NOT work: the confirmation makes us enter later (higher price), so on a
 * fast V-reversal we buy higher and earn less per recovery; and if the bounce fails we
 * still re-enter on the next confirmed bounce, so it does not fully eliminate MDD, it
 * just shifts entries. In a slow grind-down that never closes back above the band, we
 * never enter and miss the whole recovery.
 */
function onUpdate(ctx) {
  const bb1 = ctx.bb(20, 2, 1);
  const bb2 = ctx.bb(20, 2, 2);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (bb1 == null || bb1.lower == null || bb1.mid == null) return null;
  if (bb2 == null || bb2.lower == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      if (price >= bb1.mid) return { side: 'sell', qty: pos };
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
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  // Bear leg: require a confirmed bounce off the lower band.
  // Last bar closed below the lower band, and now closed back above it.
  const prevClose = ctx.closes[ctx.closes.length - 2];
  const bounced = prevClose < bb2.lower && price > bb1.lower;

  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  if (fg < 40 && bounced) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
