/*
 * @coinsori-strategy v1
 * name: ETH Trend-Gated Vol-Target 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the pure vol-targeted ETH hold is proven but always keeps
 * some cash, so it underperforms buy-and-hold in strong bull runs. This version
 * adds a trend gate: when the price is above its 50-day average (uptrend) it
 * stays FULLY invested and captures the whole bull; only when the price is below
 * the average (downtrend) does it de-risk via the ATR vol-target. This targets
 * the known weakness (missing bulls) while keeping the known strength (cutting
 * crash drawdowns). Hysteresis around the gate was tested and made it worse, so
 * a clean SMA50 gate is retained.
 * When it buys and sells: if price > SMA50, hold full position. If price < SMA50,
 * size so the daily ATR move is ~2% of account value (smaller in vol). Rebalance
 * daily. Never short.
 * When it does NOT work: in a choppy sideways market where price oscillates
 * around the SMA50, the trend gate flips on/off, adding churn. It also still
 * falls in a crash (just less than hold).
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

  let targetQty;
  if (trendUp) {
    // uptrend: stay fully invested (fixes the 'always partly in cash' weakness)
    targetQty = equity / price;
  } else {
    // downtrend: de-risk via ATR vol-target (2% daily move)
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
