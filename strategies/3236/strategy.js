/*
 * @coinsori-strategy v1
 * name: BNB 1D Momentum + Fast Trend Exit
 * ex: binance
 * syms: BNBUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the 90-day momentum + 200-day average core is the validated
 * champion on BNB. Its known weakness is riding the 2022 bear down to the slow
 * momentum exit. Adding a faster EMA50 trend exit cuts that losing leg early,
 * which the ledger showed is what drags the middle window negative.
 * When it buys and sells: buys when 90-day momentum is above +20% and price is
 * above the 200-day average. Sells when momentum fades below +5%, price breaks
 * the 200-day average, OR price closes below the 50-day average (fast exit).
 * When it does NOT work: in a choppy sideways market the fast exit whipsaws
 * (in and out repeatedly, paying fees). It can also lag a raging bull by
 * exiting a normal pullback. Single-symbol means no diversification.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const ema50 = ctx.ema(50, 1);
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  // Hiking = rate now higher than 30 days ago. Fed data is optional (the DB
  // alias may be disconnected); missing data means "not hiking" = trade freely.
  const fedNow = ctx.data('macro_fed_funds');
  const fedLag = ctx.data('fed_lag30');
  const hiking = (fedNow != null && fedLag != null) ? (fedNow > fedLag) : false;

  const pos = ctx.position;

  if (pos > 0 && (roc90 < 5 || prevClose < sma200 || (ema50 != null && prevClose < ema50))) {
    return { side: 'sell', qty: pos };
  }
  if (pos === 0 && roc90 > 20 && prevClose > sma200 && !hiking) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
