/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Trailing Stop
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated 90-day momentum + 200-day average core is the
 * champion on BTC/ETH/SOL/BNB. Its exit waits for momentum to fade (roc90<5),
 * which hands back large gains in sharp drawdowns. This variant replaces that
 * exit with a trailing stop so profits are locked in as the price falls.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is above
 * the 200-day average, and the Fed is not hiking. Sells when the close falls 18%
 * below the highest close since entry (or breaks the 200-day average as a safety).
 * When it does NOT work: a tight 18% stop whipsaws in a choppy bull where daily
 * swings exceed the stop, and it exits early in a strong trend that later resumes.
 * Single-symbol means no diversification across coins.
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
    // Track highest close since entry; 18% trailing stop (judgement: BNB daily
    // swings can exceed 10%, so 18% gives room while still cutting big drawdowns).
    const peak = (st.peak == null) ? (ctx.entryPx || prevClose) : st.peak;
    const newPeak = Math.max(peak, prevClose);
    if (prevClose < newPeak * 0.82 || prevClose < sma200) {
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
