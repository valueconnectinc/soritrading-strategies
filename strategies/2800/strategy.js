/*
 * @coinsori-strategy v1
 * name: BTC 1D Hashrate-Smoothed Trend Guard
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On-chain miner hashrate (network computing power) is a
 * slow fundamental that tends to rise in healthy bull phases and stall or
 * fall in capitulation. This uses the 30-day SMOOTHED hashrate (already a
 * rolling average, so much less noisy than the raw daily series) compared to
 * its own level ~30 days earlier, plus a 100-day price guard for bear defense.
 * When it buys and sells: holds Bitcoin while smoothed hashrate is rising vs
 * ~30 days ago AND price is above its 100-day average; sells to cash when
 * smoothed hashrate turns down or price falls below the 100-day average.
 * When it does NOT work: hashrate is a mostly-rising series, so in sideways
 * chop it can hold through drawdowns; and the 100-day guard lags sharp
 * V-shaped recoveries (re-enters late).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const raw = ctx.data('hashrate_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  // Rolling 30-bar history of the smoothed series for the "vs ~30 days ago".
  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0];

  // Hysteresis on the smoothed series — wider band (1%) since we want fewer,
  // more decisive flips on a smoothed signal.
  const rising = now > past * 1.01;
  const falling = now < past * 0.99;

  const sma100 = ctx.sma(100, 1);
  const priceBull = (sma100 == null) || price > sma100;

  if (pos > 0) {
    if (falling || !priceBull) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  if (rising && priceBull) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
