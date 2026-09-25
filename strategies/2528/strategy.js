/*
 * @coinsori-strategy v1
 * name: Regime-Switch Hybrid VolTargeted
 * ex: binance
 * syms: BTCUSDT, SOLUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The regime-switch hybrid champion (fear-contrarian bear leg +
 * selective trend leg) is the best strategy in this job but its documented weakness
 * is high drawdown (33-51% on BTC, up to 80% on SOL) because it goes all-in on both
 * legs. This variant keeps the exact same entries and exits but replaces all-in
 * sizing with volatility-targeted position sizing: positions are scaled by inverse
 * ATR so high-volatility periods (where big drawdowns happen) take smaller positions.
 * The ledger shows this exact axis improved another strategy's MDD without hurting
 * returns (choppy window +94% vs +65%, MDD 26% vs 30%).
 * When it buys and sells: identical to the champion — bear regime buys panic bottoms
 * (fear<40 + lower Bollinger break, mid-band exit); bull regime buys pullbacks to the
 * 20-EMA in a confirmed uptrend (exit below the 50-EMA). Only the SIZE differs.
 * When it does NOT work: same as champion — sideways chop whipsaws the 50-EMA, and a
 * sharp V-reversal straight through the 50-EMA gives the trend leg no entry. Vol
 * targeting reduces but does not eliminate the high-drawdown risk on volatile alts.
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

  // Volatility-targeted position size: risk budget / ATR, capped so we never
  // exceed full cash. The 0.25 risk budget means a 1-ATR adverse move costs ~25%
  // of equity; higher ATR (more volatile) naturally yields a smaller position.
  // This is the ONLY change from the champion — entries and exits are untouched.
  const riskBudget = 0.25; // fraction of equity risked per 1 ATR of adverse move
  const volQty = (ctx.cash / price) * (riskBudget / (atr / price));
  const qty = Math.min(volQty, ctx.cash / price * 0.99);

  if (bull) {
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
