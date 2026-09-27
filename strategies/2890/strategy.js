/*
 * @coinsori-strategy v1
 * name: Hashrate Regime BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC hashrate (miner compute) is a smooth, slow on-chain
 * signal of network commitment. Rising hashrate above its 30-day average means
 * miners are investing more hardware into the network (bullish regime); falling
 * hashrate means miner capitulation (bearish regime). This uses hashrate as the
 * PRIMARY signal, not an overlay: buy BTC and hold while hashrate is above its
 * 30-day average, exit when it drops below. Unlike the per-bar on-chain triggers
 * that whipsawed, hashrate's smoothness makes it a viable slow regime position.
 * When it buys and sells: buys when hashrate crosses above its 30-day average,
 * sells when it crosses back below. Stays in cash otherwise.
 * When it does NOT work: in a long sideways market where hashrate hovers around
 * its average it whipsaws; and mining hashrate can lag or be distorted by
 * hardware/energy-price shifts unrelated to BTC price direction.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  if (hr == null || hrSma == null || hrSma <= 0) return null;

  const st = ctx.state;

  if (pos > 0) {
    // Sell when hashrate falls back below its 30-day average (miner capitulation).
    if (hr < hrSma) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  // Buy when hashrate crosses above its 30-day average (miners committing).
  if (hr > hrSma) {
    st.cooldown = null;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
