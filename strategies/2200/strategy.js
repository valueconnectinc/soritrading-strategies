/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target Hysteresis 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the trend-gated vol-target (SMA50 gate) is validated on ETH
 * and BTC, but its known weakness is churn when price oscillates around the
 * 50-day average — the gate flips on/off, buying late into rallies and selling
 * late into dips. This version adds HYSTERESIS (a dead-band around the SMA50):
 * once in uptrend mode it stays there until price falls a meaningful distance
 * below the average; once in downtrend mode it stays until price rises a
 * meaningful distance above. This cuts the whipsaw churn in sideways markets.
 * When it buys and sells: in uptrend mode hold full position. Flip to downtrend
 * de-risk only when price < SMA50 - 1.0*ATR. In downtrend mode size to 2% daily
 * ATR move; flip back to full only when price > SMA50 + 1.0*ATR. Rebalance daily.
 * When it does NOT work: the hysteresis makes the gate slower to react, so at a
 * genuine trend turn it stays in the wrong mode longer (bigger initial drawdown
 * into a new downtrend). It still loses in a crash (just less than hold).
 */
function onUpdate(ctx) {
  const atr = ctx.atr(14, 1);
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (atr == null || sma50 == null || price == null || price <= 0) return null;

  // persist the current regime across bars (0=downtrend/de-risk, 1=uptrend/full)
  let mode = ctx.state.mode;
  if (mode == null) mode = price > sma50 ? 1 : 0;

  const band = atr; // dead-band of one ATR around the average (hysteresis width)
  if (mode === 1) {
    // uptrend: only flip down when price falls clearly below the average
    if (price < sma50 - band) mode = 0;
  } else {
    // downtrend: only flip up when price rises clearly above the average
    if (price > sma50 + band) mode = 1;
  }
  ctx.state.mode = mode;

  const equity = cash + pos * price;
  let targetQty;
  if (mode === 1) {
    targetQty = equity / price; // full investment in uptrend
  } else {
    const targetValue = (0.02 * equity) / (atr / price); // 2% daily ATR vol-target
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
