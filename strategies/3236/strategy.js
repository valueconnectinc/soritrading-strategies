function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // Absolute vol target: full size when daily ATR% <= 4%, scale down linearly
  // to 0.3 at ATR% >= 8%. Independent of own-history average.
  const atr = ctx.atr(14, 1);
  let scale = 1;
  if (atr != null && prevClose > 0) {
    const atrPct = atr / prevClose * 100;
    if (atrPct > 4) scale = Math.max(0.3, Math.min(1, (8 - atrPct) / 4));
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
