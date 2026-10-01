/*
 * @coinsori-strategy v1
 * name: Upbit BTC 1D Defensive Mean-Reversion
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: The experiment ledger proved defensive mean-reversion is the only
 * robust edge on crypto majors — it buys sharp pullbacks inside an uptrend and rides the
 * snap-back, keeping drawdown small. This is that validated recipe adapted to upbit BTC 1d
 * (KRW), the only series currently in the candle store.
 * When it buys and sells: buy when price closes below the lower Bollinger (20,2.5) with
 * RSI(14) < 30 while the 200-day average is rising; exit when price closes back above the
 * 20-day EMA, or on a 2.5x ATR trailing stop from the highest close since entry.
 * When it does NOT work: in a broad bear the rising-trend gate keeps it flat (capital safe,
 * little upside); in a straight-line melt-up it still lags holding BTC outright. Short
 * history (2024-08 onward) means it has not been tested through a full bear cycle.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || sma200 == null || sma200prev == null || ema20 == null || atr == null || atr <= 0) return null;

  const uptrend = sma200 > sma200prev;
  const pos = ctx.pos('BTC');

  if (pos > 0) {
    // Trail anchored to the highest close since entry so winners run, reversals get cut.
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const trailStop = peak - 2.5 * atr;
    if (price < trailStop || price > ema20) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (!uptrend) return null;

  // Oversold flush inside an uptrend = a dip getting bought, the mean-reversion setup.
  if (!(price < bb.lower && rsi < 30)) return null;

  // Risk 1.5% of equity per trade, inverse-ATR sized so a big ATR buys less. Cap at 95% of cash.
  const riskBudget = 0.015 * ctx.cash;
  let qty = riskBudget / atr;
  const maxQty = (ctx.cash / price) * 0.95;
  qty = Math.min(qty, maxQty);
  if (qty <= 0) return null;
  ctx.state.peak = price;
  return { side: 'buy', qty: qty };
}
