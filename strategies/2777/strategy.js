/*
 * @coinsori-strategy v1
 * name: FearGreed Contrarian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A third signal family — market SENTIMENT instead of price
 * or on-chain. Uses the Crypto Fear & Greed index (0-100). Classic contrarian
 * hypothesis: extreme fear marks capitulation bottoms (buy), extreme greed
 * marks euphoric tops (sell). Hysteresis keeps it from churning in the middle.
 * When it buys and sells: buys when sentiment is deeply fearful (<=25), sells
 * when it turns greedy (>=70). Stays flat in the neutral middle.
 * When it does NOT work: in a persistent bull market it sits out most of the
 * rally (fear rarely triggers) and can sell too early into continued gains;
 * in a grinding bear it buys falling knives at every fear spike. Slow, few
 * trades, long flat periods.
 */
function onUpdate(ctx) {
  const pos = ctx.position;

  const raw = ctx.data('fear_greed');
  const v = Number(raw);
  if (!Number.isFinite(v)) return null; // sentiment unavailable: sit out

  if (pos > 0) {
    // Sell when greed takes over (>=70) — crowd euphoria is the exit signal.
    if (v >= 70) return { side: 'sell', qty: pos };
    return null;
  }
  // Buy only at deep fear (<=25) — capitulation is the entry signal.
  if (v <= 25) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
