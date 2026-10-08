/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + 30% Hard Stop
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated momentum core's only real weakness is deep
 * drawdowns (73% MDD in the 2020-23 window). Keeping the proven momentum-fade
 * exit but adding a wide 30% trailing hard stop should cut only the catastrophic
 * drawdowns, not the normal ride, preserving most of the champion's return.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is
 * above the 200-day average, and the Fed is not hiking. Sells when momentum
 * fades below +5%, price breaks the 200-day average, OR the close falls 30%
 * below the highest close since entry (hard stop).
 * When it does NOT work: in a violent bear the 30% stop still lets a big loss
 * happen before triggering; in a normal bull it should rarely trigger. Single
 * symbol = no diversification.
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

  // Hiking = rate now higher than 30 days ago. Missing Fed data treated as not
  // hiking so the strategy still trades (baseline behaviour).
  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.position;
  const st = ctx.state || {};

  if (pos > 0) {
    // Track peak; 30% hard stop (judgement: wide enough to avoid the 18% churn,
    // tight enough to cap the catastrophic 70%+ drawdowns the champion saw).
    const peak = (st.peak == null) ? (ctx.entryPx || prevClose) : st.peak;
    const newPeak = Math.max(peak, prevClose);
    if (roc90 < 5 || prevClose < sma200 || prevClose < newPeak * 0.70) {
      return { side: 'sell', qty: pos };
    }
    ctx.state = { peak: newPeak };
    return null;
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
