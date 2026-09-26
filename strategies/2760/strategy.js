/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Trend-Strength RSIFloor ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Improvement on the trend-strength Donchian-pullback
 * champion (2759). Same trend-pullback family, but with a ONE-SIDED RSI floor on
 * the entry: only buy a pullback when RSI(14) is above 30. Bet: in a genuine
 * uptrend a healthy pullback rarely pushes RSI below 30; a pullback that does is
 * a trend break / falling knife — the champion's known weak spot. Unlike the
 * two-sided 35-55 band, the floor does NOT block entries during strong trends
 * where RSI stays elevated, so it keeps the melt-up capture.
 * When it buys and sells: buys when price pulls back to the lower 20-bar
 * Donchian channel, price above a RISING 200-SMA that rose >=0.15% over 5 bars,
 * AND RSI(14) is above 30 (not a deep-oversold trend break); sells at the middle
 * Donchian channel, when the 200-SMA stops rising, or on a 3x-ATR stop.
 * 5-bar cooldown.
 * When it does NOT work: same as the champion — below the 200-SMA it sits out;
 * in a fake/weak uptrend the pullback keeps going; the RSI floor may skip a few
 * capitulation bounces that recover fast from deep oversold.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;

  const uptrend = price > sma200 && sma200 > sma200prev;

  if (pos > 0) {
    const dcMid = (ctx.high(20, 1) + ctx.low(20, 1)) / 2;
    if (dcMid != null && price >= dcMid) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (!uptrend) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (!uptrend) return null;

  const rise = (sma200 - sma200prev) / sma200prev;
  if (rise < 0.0015) return null;

  // RSI FLOOR: a healthy uptrend pullback rarely pushes RSI below 30. Below 30
  // = trend break (falling knife). One-sided so strong-trend entries survive.
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  if (rsi < 30) return null;

  const dcLow = ctx.low(20, 1);
  if (dcLow != null && price <= dcLow * 1.01) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
