/*
 * @coinsori-strategy v1
 * name: Onchain Demand Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different signal family — on-chain network
 * demand instead of price. Hypothesis: a rising count of daily active BTC
 * addresses reflects real user/network growth that tends to confirm price
 * uptrends; a falling count signals waning demand. We hold BTC while network
 * demand is expanding and step aside when it contracts.
 * When it buys and sells: holds BTC while the 30-day active-address trend is
 * rising versus ~30 days earlier; sells to cash when it turns down. Slow,
 * low-turnover fundamental timing.
 * When it does NOT work: network activity can lag price in fast speculative
 * melt-ups and can miss sharp recoveries where price jumps before addresses
 * catch up. On-chain data must be live in the feed (it is — probes traded).
 */
function onUpdate(ctx) {
  const pos = ctx.position;

  // Raw daily active BTC addresses (probe confirmed this key is live).
  const raw = ctx.data('addr');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null; // data unavailable: sit out

  // Rolling window of the last 30 values to compare against ~30 bars ago.
  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0]; // value ~29 bars ago

  const expanding = now > past; // demand growing over the last 30 days

  if (pos > 0) {
    if (!expanding) return { side: 'sell', qty: pos };
    return null;
  }
  if (expanding) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
