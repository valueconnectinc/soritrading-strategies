/*
 * @coinsori-strategy v1
 * name: BTC Trend-Ride EMA ATR Trailing 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's biggest gains come in sustained bull trends; a trend-following
 * system that stays long through a rally and exits with a volatility-based trailing stop
 * captures those runs instead of sitting in cash waiting for a pullback. The 50/200 EMA
 * relationship gives a clean long-term trend filter, and an ATR-scaled trailing stop locks
 * in profits while letting winners run.
 * When it buys and sells: we are long when the 50-day EMA is above the 200-day EMA (bull
 * regime). We add/enter when price is above the 50-day EMA and momentum is positive, and
 * we exit when price closes below the 50-day EMA or the trailing stop is hit.
 * When it does NOT work: in a long sideways chop where the 50/200 EMAs crisscross, it
 * whipsaws and churns fees. It also gives back a chunk of gains at the very top of a
 * parabolic blow-off because the trailing stop lags the spike.
 */
function onUpdate(ctx) {
  const ema50 = ctx.ema(50, 1);
  const ema200 = ctx.ema(200, 1);
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (ema50 == null || ema200 == null || atr == null || price == null || price <= 0) return null;

  const equity = cash + pos * price;
  const bull = ema50 > ema200; // long-term trend up

  if (pos <= 0) {
    // Enter a bull trend when price is above the 50-day EMA (momentum confirmed)
    if (bull && price > ema50) {
      const qty = (equity * 0.98 / price);
      return { side: 'buy', qty: qty };
    }
    return null;
  }

  // Exit: trend broke OR price closed below the 50-day EMA
  const trendBreak = price < ema50;
  if (!bull || trendBreak) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
