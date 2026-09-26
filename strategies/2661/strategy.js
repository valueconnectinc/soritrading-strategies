/*
 * @coinsori-strategy v1
 * name: On-Chain Regime Momentum BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On-chain activity is a slow adoption signal that lags
 * price — so it is used here as a REGIME GATE, not a trigger. Momentum does
 * the trading; on-chain only blocks entries when BTC network usage is in a
 * confirmed downtrend. This avoids the daily flip-flop that killed a naive
 * on-chain trend strategy: the gate compares the smoothed 30-day average to
 * its own value 30 bars earlier (held in state), so it only flips on sustained
 * change.
 * When it buys and sells: buys when price > 200-SMA (long-term uptrend) and
 * the smoothed on-chain level is rising (30-day avg higher than 30 days ago).
 * Sells when price falls below the 200-SMA or the on-chain level stops rising,
 * with a 15-bar cooldown after any exit to stop churn.
 * When it does NOT work: lags sharp V-bottoms (waits for on-chain to confirm)
 * and gives back gains in sideways chop where the 200-SMA whipsaws. On-chain
 * data is daily, so it cannot time intraday moves.
 */
function onUpdate(ctx) {
  const s = ctx.state;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  // Roll a 30-bar-lagged copy of the smoothed on-chain level through state.
  // onUpdate runs per-tick, so only advance the history when the bar changes.
  const aNow = ctx.data('addr_sma30');
  if (aNow == null) return null;
  if (s.lastBarI !== ctx.i) {
    s.hist = s.hist || [];
    s.hist.push(aNow);
    if (s.hist.length > 31) s.hist.shift();
    s.lastBarI = ctx.i;
  }
  if (s.hist.length < 31) return null;
  const aPrev = s.hist[s.hist.length - 31];
  const onchainUp = aNow > aPrev;

  if (pos > 0) {
    if (price < sma200 || !onchainUp) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 8) {
      s.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Cooldown after any exit to stop the churn that killed the naive version.
  const lastExit = s.lastExit || 0;
  if (ctx.i - lastExit < 15) return null;

  if (price > sma200 && onchainUp) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
