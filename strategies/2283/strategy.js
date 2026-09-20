/*
 * @coinsori-strategy v1
 * name: BTC Simple SMA50 Trend Ride 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A/B test against the trend-gated vol-target champion. The
 * champion underperformed buy-and-hold on fresh steady-bull windows (2019-21 +712%
 * vs +881%, 2023-26 +51% vs +103%) because its crash-stop and vol-target churn gave
 * up bull upside. This isolates the question: does a plain SMA50 on/off (fully
 * invested above, cash below) do better on the same windows? Tests whether the
 * vol-target complexity helps or hurts.
 * When it buys and sells: fully invested when price is above SMA50, all cash below.
 * When it does NOT work: whipsaws around the SMA50 in choppy ranges, and it is
 * fully exposed to deep bull corrections (no crash stop).
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (sma50 == null || price == null || price <= 0) return null;

  const above = price > sma50;
  if (above && pos <= 0) {
    return { side: 'buy', qty: (cash / price) * 0.98 };
  } else if (!above && pos > 0) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
