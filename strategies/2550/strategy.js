/*
 * @coinsori-strategy v1
 * name: Stochastic Oversold Mean-Reversion BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic %K measures where the close sits inside the recent
 * price range. When it is deeply oversold (<20) inside an uptrend, price is likely to
 * snap back up — a mean-reversion entry using a different oscillator than RSI or
 * Bollinger. It is a defensive, low-drawdown complement to the champion, using only
 * price data (no external feed).
 * When it buys and sells: buys when %K < 20 (oversold) while price is above the
 * 200-EMA (uptrend intact); sells when %K > 80 (overbought) or price breaks the
 * 20-bar low (a hard-stop proxy). Position is volatility-targeted so a 1-ATR adverse
 * move costs ~1.5% of equity.
 * When it does NOT work: in a true crash the oversold signal fires repeatedly into a
 * falling knife (the 200-EMA gate is the only protection); in a slow drift-down below
 * the 200-EMA it never trades and misses nothing but also captures no rebound. In a
 * tight range %K spends time below 20 without reverting, causing small whipsaws.
 */
function onUpdate(ctx) {
  const st = ctx.stoch(14, 3, 1);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (st == null || st.k == null || ema200 == null || atr == null) return null;
  const price = ctx.price;

  // lowest low of last 20 bars for the exit
  let lo = Infinity;
  for (let k = 1; k <= 20; k++) {
    const l = ctx.low(1, k);
    if (l == null) return null;
    if (l < lo) lo = l;
  }

  const pos = ctx.position;
  if (pos > 0) {
    if (price < lo) return { side: 'sell', qty: pos };
    if (st.k > 80) return { side: 'sell', qty: pos };
    return null;
  }

  // Only buy oversold dips inside an uptrend — avoids catching falling knives.
  if (price <= ema200) return null;
  if (st.k >= 20) return null;

  // Volatility-targeted sizing: 1-ATR adverse move costs ~1.5% of equity.
  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  const qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  return { side: 'buy', qty: qty };
}
