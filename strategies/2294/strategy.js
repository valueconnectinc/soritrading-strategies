/*
 * @coinsori-strategy v1
 * name: BTC Bull-Pullback Mean Reversion 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: inside a long-term bull market, sharp pullbacks to oversold levels
 * tend to snap back to the trend (mean reversion) — buying those bounces captures a
 * repeatable edge that trend-following misses. The bull gate (price above the 200-day
 * EMA) keeps us out of falling knives in bear markets, where oversold stays oversold.
 * When it buys and sells: we only act when price is above the 200-day EMA (bull regime).
 * We buy when the 14-day RSI drops below 30 (oversold) and price is at least 5% below
 * the 50-day EMA (a deep pullback). We sell when price recovers back above the 50-day
 * EMA or RSI climbs above 55 (the bounce is done), or if price falls 8% below our entry
 * (hard stop).
 * When it does NOT work: in a choppy sideways bull (no deep pullbacks to buy, or bounces
 * that stall just below the mean), it sits in cash or takes small losses. It also misses
 * the strongest part of a clean uptrend because it waits for a pullback that may never
 * come. In a slow grind-down that stays above the 200-day EMA for a while, it buys
 * pullbacks that keep making lower highs.
 */
function onUpdate(ctx) {
  const ema200 = ctx.ema(200, 1);
  const ema50 = ctx.ema(50, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  const entryPx = ctx.entryPx;
  if (ema200 == null || ema50 == null || rsi == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const bull = price > ema200; // only trade in a long-term bull regime

  if (pos <= 0) {
    // Entry: bull regime + oversold + deep pullback below the 50-day EMA
    if (bull && rsi < 30 && price < ema50 * 0.95) {
      // size so a 10% adverse move costs ~2% of equity (risk budget)
      const frac = Math.min(1.0, 0.20);
      const qty = (equity * frac / price) * 0.98;
      if (qty > 0) return { side: 'buy', qty: qty };
    }
    return null;
  }

  // Exit conditions
  const bounceDone = price > ema50 || rsi > 55;
  const hardStop = entryPx != null && price < entryPx * 0.92; // 8% stop
  if (bounceDone || hardStop || !bull) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
