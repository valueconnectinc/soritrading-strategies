/*
 * @coinsori-strategy v1
 * name: Onchain Demand + Sentiment TopFilter BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines the two validated non-price signal families —
 * on-chain demand (addr_sma30, proven +166%/+71%) with a sentiment top-filter
 * (fear & greed). Hypothesis: extreme greed (>=80) marks euphoric tops where
 * even rising demand is chasing a late-stage rally, so step aside there.
 * Uses a DIFFERENT axis (sentiment, not price trend) than the failed price-gate.
 * When it buys and sells: buys when smoothed demand rises; sells when demand
 * turns down OR sentiment hits extreme greed (>=80).
 * When it does NOT work: the sentiment filter may fire too rarely to matter, or
 * may exit a genuine melt-up early (greed stays high during real rallies); if
 * it does not add value the pure demand signal was already optimal.
 * On-chain data is live in the feed (verified).
 */
function onUpdate(ctx) {
  const pos = ctx.position;

  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  const fgRaw = ctx.data('fear_greed');
  const fg = Number(fgRaw);

  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0];

  const rising = now > past * 1.005;
  const falling = now < past * 0.995;

  if (pos > 0) {
    // Exit on demand drop OR extreme greed (euphoric top).
    if (falling || (Number.isFinite(fg) && fg >= 80)) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  if (rising) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
