/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin network fundamentals — hashrate (miner commitment/security)
 * and active addresses (real user activity) — tend to lead or confirm price trends. A
 * price trend that is backed by growing network fundamentals is more durable than one
 * that isn't. This is a different data source than price indicators alone.
 * When it buys and sells: Buy when price is above its 50-day average AND the network is
 * still growing (hashrate above its own 30-day average). Sell when price closes below
 * the 50-day average or hashrate rolls over (falls below its 30-day average).
 * When it does NOT work: In a pure speculation-driven bull market where price runs up
 * without network growth, this holds us out and lags; and on-chain data is slow-moving,
 * so it cannot catch fast price reversals.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma50 == null || px <= 0) return null;

  // On-chain regime: hashrate above its 30-day average = network expanding (bullish).
  // Use the precomputed 30-day SMA of hashrate so we compare current hashrate to it.
  const hr = ctx.data('hashrate');
  const hrSma = ctx.data('hashrate_sma30');
  // Active addresses as a secondary confirmation of user growth.
  const addr = ctx.data('addr');

  // Network regime is bullish when hashrate is above its 30-day average. If the data
  // is missing (null = unknown), fall back to price-only so we don't get stuck out.
  let netBull = true;
  if (hr != null && hrSma != null && hrSma > 0) {
    netBull = hr > hrSma;
  }

  if (pos === 0) {
    // Buy only when price trend AND network regime both agree.
    if (px > sma50 && netBull && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Exit when price trend breaks OR network regime rolls over.
  if (px < sma50 || !netBull) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
