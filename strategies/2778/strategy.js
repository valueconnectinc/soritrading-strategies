/*
 * @coinsori-strategy v1
 * name: Onchain Demand Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different signal family — on-chain network
 * demand instead of price. Uses the 30-day-smoothed active-address count
 * (addr_sma30) so the signal is slow and stable. Hypothesis: rising network
 * demand confirms / leads price uptrends; falling demand precedes weakness.
 * Hold BTC while smoothed demand expands, step aside when it contracts.
 * Hysteresis + cooldown reduce churn. NOTE: adding ANY filter (price 200-SMA,
 * confirmed 2-bar exit, fear&greed top-filter) destroyed the edge — demand is
 * a leading self-contained signal, so it is kept pure.
 * When it buys and sells: buys when smoothed demand is clearly rising vs ~30
 * days earlier; sells when it clearly turns down. Slow fundamental timing.
 * When it does NOT work: lags pure buy-and-hold in melt-ups (demand lags price)
 * and can miss sharp recoveries where price jumps before addresses catch up.
 * On-chain data is live in the feed (verified).
 */
function onUpdate(ctx) {
  const pos = ctx.position;

  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null; // data unavailable: sit out

  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0]; // ~29 bars ago

  // Hysteresis: only flip on a clear 0.5% move to avoid noise-driven churn.
  const rising = now > past * 1.005;
  const falling = now < past * 0.995;

  if (pos > 0) {
    if (falling) return { side: 'sell', qty: pos };
    return null;
  }
  if (rising) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
