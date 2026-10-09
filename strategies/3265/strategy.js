/*
 * @coinsori-strategy v1
 * name: Fed-Gated Momentum Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto's best risk-adjusted edge in this ledger has been a SLOW
 * momentum trend — buy when the 90-day return is strongly positive and price is above
 * its 200-day average, sell when that momentum fades. Adding a macro gate (only enter
 * when the central bank is NOT hiking rates) was proven to improve the same core by
 * blocking entries during hiking bears. This combines those two validated pieces.
 * When it buys and sells: buys when 90-day momentum is above +20% and price is above
 * the 200-day average AND the fed funds rate is not rising (not hiking). Sells when
 * 90-day momentum falls below +5% or price closes below the 200-day average.
 * When it does NOT work: in a long flat sideways market momentum stays weak so the
 * strategy sits in cash (safe but no upside); it lags sharp V-shaped melt-ups where
 * price jumps before momentum catches up. The fed data is daily so this is a slow,
 * low-churn strategy, not a day-trade.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 90-day rate of change (as a fraction). Need at least 90 bars of history.
  const closes = ctx.closes;
  if (!closes || closes.length < 95) return null;
  const prevClose = closes.at(-2);           // last CLOSED bar
  const pastClose = closes.at(-92);          // 90 bars before the closed bar
  if (!Number.isFinite(prevClose) || !Number.isFinite(pastClose) || pastClose <= 0) return null;
  const roc90 = (prevClose / pastClose) - 1;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Fed regime: block NEW entries while the fed funds rate is rising (hiking).
  // fed_lag30 is the rate 30 days earlier; if today's rate is higher, the Fed is hiking.
  const fed = ctx.data('fed');
  const fedLag = ctx.data('fed_lag30');
  let notHiking = true;                       // default: allow (fed data may be missing)
  if (fed != null && fedLag != null && Number.isFinite(fed) && Number.isFinite(fedLag)) {
    notHiking = fed <= fedLag;
  }

  const pos = ctx.position || 0;
  const st = ctx.state;

  if (pos > 0) {
    // Exit when momentum fades (below +5%) or price loses the 200-day trend.
    const exit = roc90 < 0.05 || prevClose < sma200;
    ctx.watch([{ side: 'sell', price: sma200, trigger: 'below', note: '200-day trend exit' }]);
    if (exit) return { side: 'sell', qty: pos };
    return null;
  }

  // Entry: strong momentum + uptrend + not hiking. Enter with 95% of cash.
  if (roc90 > 0.20 && prevClose > sma200 && notHiking) {
    ctx.watch([{ side: 'sell', price: sma200, trigger: 'below', note: '200-day trend exit' }]);
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
