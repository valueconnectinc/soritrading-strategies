/*
 * @coinsori-strategy v1
 * name: ATR Adaptive EMA Crossover — DOGEUSDT 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following EMA crossover adapted for altcoins: buy when EMA9 crosses
 * above EMA21 AND price is above EMA200 (trend confirmation) AND ATR is
 * rising (momentum building). Sell when EMA9 crosses below EMA21 OR price
 * drops below EMA200 (trend breakdown).
 * ATR-based dynamic stop: stop loss = entry - 1.5×ATR(14). This adapts
 * automatically to DOGE's high volatility vs a fixed-percentage stop.
 * When it does NOT work: choppy markets where EMAs cross repeatedly — each
 * cross triggers a loss. Also underperforms in strong mean-reversion regimes
 * where oversold bounces happen faster than EMA crossover signals.
 */

function onUpdate(ctx) {
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const ema200 = ctx.ema(200);
  const atr   = ctx.atr(14);

  if (ema9 == null || ema21 == null || ema200 == null || atr == null) return null;

  // Previous bar values for crossover detection
  const ema9_1  = ctx.ema(9,  1);
  const ema21_1 = ctx.ema(21, 1);
  const ema200_1 = ctx.ema(200, 1);
  const atr_1   = ctx.atr(14, 1);

  if (ema9_1 == null || ema21_1 == null || ema200_1 == null || atr_1 == null) return null;

  const price = ctx.price;

  // ATR rising = momentum building (not a dying move)
  const atrRising = atr > atr_1;

  if (ctx.position === 0) {
    // Entry: EMA9 crosses above EMA21 + price above EMA200 + ATR momentum
    const goldenCross = ema9_1 <= ema21_1 && ema9 > ema21;
    const above200 = price > ema200 && price > ema200_1;

    if (goldenCross && above200 && atrRising) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  } else {
    // Dynamic stop: entry price - 1.5×ATR (adapts to DOGE volatility)
    const entry = ctx.entryPx;
    const stopPx = entry - 1.5 * atr;

    // Exit: EMA9 crosses below EMA21 OR stop loss OR price below EMA200
    const deathCross = ema9_1 >= ema21_1 && ema9 < ema21;
    const below200 = price < ema200;

    if (deathCross || below200 || price <= stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
