/*
 * @coinsori-strategy v1
 * name: ETH Fast Dual-Oscillator Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Very short-term oversold readings on both RSI and Stochastic
 * mark brief panic dips that snap back within a few bars. This is a fast
 * mean-reversion edge, distinct from the longer Bollinger-band bounce — it takes
 * many small low-drawdown trades instead of few big ones.
 * When it buys: when RSI(14) is oversold AND Stochastic K is oversold (both below
 * their low thresholds) — a double-confirmed panic dip. Sells when price recovers
 * to a modest take-profit or after a tight stop.
 * When it does NOT work: in a sustained one-directional trend the oversold dip
 * keeps falling (buying a falling knife) and the tight stop bleeds; it also
 * underperforms buy-and-hold in melt-ups because it repeatedly exits winners early.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14, 1);
  const st = ctx.stoch(14, 3, 1);
  if (rsi == null || st == null || st.k == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // take profit at +6% or stop at -5% (tight, for a fast mean-reversion trade)
    if (price >= ctx.entryPx * 1.06) return { side: 'sell', qty: pos };
    if (price <= ctx.entryPx * 0.95) return { side: 'sell', qty: pos };
    return null;
  }

  // double-confirmed oversold: RSI < 30 AND Stoch K < 20
  if (rsi < 30 && st.k < 20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  return null;
}
