/*
 * @coinsori-strategy v1
 * name: BTC 1D Hashrate Fundamental + Trend Guard
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A genuinely different signal source — on-chain miner
 * hashrate (total computing power securing Bitcoin) instead of price. Rising
 * hashrate reflects growing miner commitment and a healthy network, a slow
 * fundamental that tends to rise in bull phases and stall/capitulate in bears.
 * A 100-day price average is added as a defensive guard so we do not hold
 * through a clear downtrend even if hashrate has not yet turned.
 * When it buys and sells: it holds Bitcoin while hashrate is rising versus its
 * level ~30 days ago AND price is above its 100-day average. It sells to cash
 * when hashrate clearly turns down OR price falls below the 100-day average.
 * When it does NOT work: hashrate is a slow, mostly-rising series, so in a
 * choppy sideways market it can hold through drawdowns and give back gains;
 * and the 100-day guard lags sharp V-shaped recoveries (re-enters late).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const raw = ctx.data('hashrate');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;

  // Rolling 30-bar history of hashrate for the "vs ~30 days ago" comparison.
  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0];

  // Hysteresis: rising/falling hashrate, small dead-band so it does not flip
  // on tiny noise. 0.5% band over 30 days is a gentle fundamental move.
  const rising = now > past * 1.005;
  const falling = now < past * 0.995;

  // 100-day price guard (slow trend line, few flips). Uses closed bar (ago=1).
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
