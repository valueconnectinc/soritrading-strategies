/*
 * @coinsori-strategy v1
 * name: BTC 4H Trend-Following Chandelier Exit
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: 4-hour bars capture medium-term trends that a 1-day bar
 * blurs, and a volatility-scaled trailing stop (chandelier) lets winners run
 * while cutting losers short. This is the opposite family of the defensive
 * mean-reversion champion: it rides momentum instead of buying dips, so it
 * behaves differently in the same market.
 * When it buys and sells: buys when the 50-EMA is above the 200-EMA and price
 * holds above the 50-EMA (confirmed uptrend). Sells when price closes below
 * 3xATR below the highest price since entry, or below the 200-EMA.
 * When it does NOT work: in a choppy sideways market the trend signal whipsaws
 * and fees accumulate; in a fast crash it still suffers the gap before the stop
 * triggers. It is single-symbol with no diversification, and it underperforms
 * buy-and-hold in a straight melt-up that never pulls back to trigger a re-entry.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // Closed bars only -> identical in backtest, paper and live.
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  if (ema50 == null || ema200 == null || atr == null || atr <= 0) return null;

  if (pos > 0) {
    // Track the highest price since entry so the trail is anchored to the real peak.
    const peak = ctx.state.peak != null ? Math.max(ctx.state.peak, price) : price;
    ctx.state.peak = peak;
    const stop = peak - 3 * atr; // 3xATR: wide enough to survive normal noise, tight enough to cut reversals
    if (price < stop || price < ema200) {
      ctx.state.peak = null;
      return { side: 'sell', qty: pos };
    }
    ctx.watch([{ side: 'sell', price: stop, note: 'chandelier 3xATR' }]);
    return null;
  }

  // Entry: established uptrend (50-EMA above 200-EMA) and price above the fast EMA.
  if (ema50 > ema200 && price > ema50) {
    ctx.state.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
