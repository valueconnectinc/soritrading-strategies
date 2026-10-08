/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Fed Filter + Vol-Scaled
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated 90-day momentum + 200-day average core with the
 * Fed filter. On top I add volatility-scaled position sizing: when BNB's daily
 * volatility (ATR as % of price) is high relative to its own history, I buy a
 * smaller position. The ledger showed this exact lever cut max drawdown on the
 * SOL 4H champion without killing returns — same idea here.
 * When it buys and sells: same momentum/Fed/200-day rules as the champion, but the
 * buy size is scaled down when volatility is elevated. Sells when momentum fades
 * below +5% or price breaks the 200-day average.
 * When it does NOT work: same regimes as the champion (a Fed-easing crypto bear
 * slips through the filter), plus vol-scaling trims exposure exactly when a big
 * move is building, so it can lag a violent bull.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // ATR-based volatility scaling. atr14 as % of price; scale = ratio of current
  // vol to its 90-day average. High ratio -> smaller position.
  const atr = ctx.atr(14, 1);
  const atrAvg = ctx.sma(90, 1); // placeholder, replaced below
  let scale = 1;
  if (atr != null && prevClose > 0) {
    const atrPct = atr / prevClose;
    // build a rolling average of atrPct from recent closes via a simple mean
    const atrSeries = [];
    for (let k = 1; k <= 90 && k < closes.length - 1; k++) {
      const a = ctx.atr(14, k);
      const c = closes[closes.length - 1 - k];
      if (a != null && c > 0) atrSeries.push(a / c);
    }
    if (atrSeries.length >= 30) {
      const mean = atrSeries.reduce((s, v) => s + v, 0) / atrSeries.length;
      if (mean > 0) {
        const ratio = atrPct / mean;
        // vol-target: full size at ratio<=1, scale down linearly to 0.3 at ratio>=2
        scale = Math.max(0.3, Math.min(1, 2 - ratio));
      }
    }
  }

  const fedNow = ctx.data('macro_fed_funds_rate');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.position;

  if (pos > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 * scale };
  }
  return null;
}
