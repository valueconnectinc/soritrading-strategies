/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + 90d Time Exit
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the validated momentum core's exit waits for momentum to
 * fade, which holds through entire bull runs but also hands back gains when a
 * trend dies slowly. A fixed 90-day holding period (matching the momentum
 * lookback) forces discipline: take the profit and re-evaluate.
 * When it buys and sells: buys when 90-day momentum is above +20%, price is
 * above the 200-day average, and the Fed is not hiking. Sells exactly 90 days
 * after buying (or earlier if the 200-day average breaks).
 * When it does NOT work: in a long strong bull it exits too early and misses the
 * biggest leg; in a choppy market it re-enters repeatedly and pays fees.
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
    // Fixed 90-day holding period (judgement: matches the momentum lookback so
    // we take profit at the natural cycle length instead of riding until fade).
    const held = (st.entryBar == null) ? 0 : ctx.i - st.entryBar;
    if (held >= 90 || prevClose < sma200) {
      return { side: 'sell', qty: pos };
    }
    ctx.state = { entryBar: st.entryBar == null ? ctx.i : st.entryBar };
    return null;
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    ctx.state = { entryBar: ctx.i };
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
