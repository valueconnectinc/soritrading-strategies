/*
 * @coinsori-strategy v1
 * name: ETH Trend Strength-Scaled Size 4H v5
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the ATR-sized trend ride (risk a fixed $ per trade) has
 * great downside protection but under-deploys capital in strong bull runs —
 * a fixed $300 risk never uses the full account in a clean uptrend, which is
 * why it lags buy-and-hold in bull markets. This version scales the risk by
 * trend strength: when price is far above the 200-SMA (strong trend) it risks
 * more per trade; when price hugs the SMA (weak, likely to whipsaw) it risks
 * less. A trailing ATR stop locks in gains so a strong trend's profit is not
 * given back waiting for a full SMA cross to sell.
 * When it buys and sells: long on a close above the 200-SMA. Sell when price
 * closes below the SMA OR when it falls a fixed multiple of ATR below the
 * highest close since entry (trailing stop). Size = risk / ATR with risk scaled
 * by trend strength.
 * When it does NOT work: sideways chop whipsaws in and out; a trailing stop
 * can exit a still-valid trend on a normal pullback, missing the later leg.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
      // trend strength = how far price is above the 200-SMA, in %
      const distPct = (closePrev - sma) / sma;
      // risk scales from $300 (weak) up to $1500 (strong), linear in distance
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (ctx.cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // trailing stop: track highest close since entry, sell if it falls 3 ATR below
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const peak = ctx.state.peak != null ? ctx.state.peak : closePrev;
    ctx.state.peak = Math.max(peak, closePrev);
    if (closePrev < ctx.state.peak - 3 * atr) {
      return { side: 'sell', qty: pos };
    }
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
