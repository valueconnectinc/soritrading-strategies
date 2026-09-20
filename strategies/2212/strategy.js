/*
 * @coinsori-strategy v1
 * name: SOL Hashrate-Trend-Gated Trend 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: a different family from the price/vol/sentiment filters that
 * already failed to improve SOL. Bitcoin hashrate (network computing power) is an
 * on-chain health signal — miners add power when they expect higher prices and
 * capitulate (cut power) in deep bears. So the hashrate TREND (computed across
 * bars via state) gates a SOL long: stay fully invested only while the network is
 * growing, and de-risk when miners are capitulating.
 * When it buys and sells: fully invested when SOL is above its SMA50 AND the
 * 30-day hashrate is higher than it was 30 days ago (network growing). Otherwise
 * ATR vol-target; beyond the ATR crash band fully to cash.
 * When it does NOT work: hashrate is a slow, lagging monthly signal — it can keep
 * falling for weeks after a price bottom and miss the V-shaped recovery, and it
 * does not protect against a crash that happens while hashrate is still rising.
 * Requires the hashrate_sma30 dataset loaded, or it silently runs on price only.
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const trendUp = price > sma50;

  // On-chain regime: track the hashrate_sma30 value across bars in state and
  // compare it to ~30 bars ago to decide if the network is growing. We store a
  // ring buffer of recent hashrate values in state.hr.
  const hr = ctx.data('hashrate_sma30');
  let networkUp = true; // default: no on-chain gate if data missing
  if (hr != null && hr > 0) {
    const st = ctx.state || {};
    const buf = (st.hrBuf && Array.isArray(st.hrBuf)) ? st.hrBuf : [];
    buf.push(hr);
    if (buf.length > 30) buf.shift();
    ctx.state = Object.assign({}, st, { hrBuf: buf });
    if (buf.length >= 30) {
      const old = buf[0]; // value ~30 bars ago
      networkUp = hr > old; // network growing if current > 30 bars ago
    }
  }

  // ATR-scaled crash band (same as the validated champion): 3 ATRs below SMA50.
  const crashDist = 3.0 * atr;
  const crashStop = price < sma50 - crashDist;

  let targetQty;
  if (crashStop) {
    targetQty = 0;
  } else if (trendUp && networkUp) {
    targetQty = equity / price; // uptrend + network growing: fully invested
  } else if (trendUp) {
    // Uptrend but network not growing: cap at vol-target (de-risk).
    const targetValue = (0.02 * equity) / (atr / price);
    targetQty = targetValue / price;
  } else {
    const targetValue = (0.02 * equity) / (atr / price);
    targetQty = targetValue / price;
  }

  const curQty = pos;
  const diff = targetQty - curQty;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, curQty)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(curQty, -diff) };
  }
}
