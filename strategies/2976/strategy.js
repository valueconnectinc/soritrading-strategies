/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Mode Bollinger-RSI MR + Trend Ride
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ledger shows mean reversion is the ONLY validated edge on
 * BTC 1D, but pure defensive MR badly lags melt-ups because it sits in cash. This
 * dual-mode strategy fixes that: above a rising 200-day average it rides the trend
 * with a slow moving-average momentum filter; in a confirmed bear it switches to
 * defensive Bollinger-RSI mean reversion on extreme flushes. Only core indicators —
 * no external data that fails in backtest.
 * When it buys and sells: In an uptrend (price above rising 200-day) it buys when the
 * 50-day average is above the 200-day and price is above the 50-day, sells when price
 * closes below the 50-day. In a confirmed bear (price clearly below the 200-day) it
 * buys an EXTREME flush to the lower Bollinger band with RSI<30, sized by ATR risk,
 * and sells on the snap-back above the 20-day average.
 * When it does NOT work: In a sideways chop around the 200-day line the trend mode
 * whipsaws. A persistent crash with no snap-back bleeds the MR mode. It still lags a
 * straight-line melt-up because trend entry waits for a pullback to confirm.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const sma50 = ctx.sma(50, 1);
  const ema20 = ctx.ema(20, 1);
  const bb = ctx.bb(20, 2.5, 1);
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || sma200prev == null || sma50 == null || ema20 == null || bb == null || rsi == null || atr == null || atr <= 0) return null;

  // Regime: above rising 200-day = trend mode; clearly below = defensive MR mode.
  const uptrend = sma200 > sma200prev;
  const trendMode = price > sma200;
  const bearMode = price < sma200 * 0.98;

  if (pos > 0) {
    if (trendMode) {
      // Trend mode exit: trend broken when price closes back below the 50-day average.
      if (price < sma50) {
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Bear mode exit: snap-back to the mid band.
    if (price > ema20 || rsi > 55) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (trendMode && uptrend) {
    // Trend entry: 50-day above 200-day (golden-cross structure) and price above 50-day.
    if (sma50 > sma200 && price > sma50) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // Defensive MR entry: extreme flush below the lower Bollinger band in a bear.
  if (bearMode && price < bb.lower && rsi < 30) {
    // ATR-scaled size: risk 1% of equity per trade, capped at 90% of cash.
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
