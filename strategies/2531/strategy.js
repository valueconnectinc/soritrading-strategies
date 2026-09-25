/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid VolTargeted + BearTrendSizing
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The regime-switch hybrid champion (fear-contrarian bear leg +
 * selective trend leg) beats buy-and-hold on all three BTC 4h windows but its
 * documented weakness is high drawdown (30-39% MDD on BTC, up to 80% on SOL) because
 * it goes all-in on both legs. The previous cycle added volatility-targeted sizing
 * (inverse-ATR) which helped. This variant keeps every entry and exit identical and
 * adds ONE more sizing rule: in a confirmed LONG-TERM downtrend (price below the
 * 200-EMA), the bear leg takes a smaller position, because panic-buys in a deep bear
 * are more likely to keep falling — that is exactly where the biggest drawdowns come
 * from. The trend leg is untouched.
 * When it buys and sells: identical to the champion — bear regime buys panic bottoms
 * (fear<40 + lower Bollinger break, mid-band exit); bull regime buys pullbacks to the
 * 20-EMA in a confirmed uptrend (exit below the 50-EMA). Only the bear-leg SIZE differs.
 * When it does NOT work: same as champion — sideways chop whipsaws the 50-EMA, and a
 * sharp V-reversal straight through the 50-EMA gives the trend leg no entry. Scaling
 * down in deep bear reduces but does not eliminate the high-drawdown risk on volatile
 * alts.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (ema200 == null) return null;
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

  // Volatility-targeted position size (unchanged from champion): a 1-ATR adverse move
  // should cost ~1.5% of equity. Position fraction = riskBudget / (atr/price).
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

  // Bear leg: in a confirmed long-term downtrend (price below 200-EMA), cut the
  // position to half — a panic-buy in a deep bear more often keeps falling, and that
  // is where the biggest drawdowns live. This is the ONLY change from the vol-targeted
  // champion; entries and exits are untouched.
  if (price < ema200) qty = qty * 0.5;

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }

  return null;
}
