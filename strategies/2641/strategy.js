/*
 * @coinsori-strategy v1
 * name: Band-Bounce + Trend-Participation ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The band-bounce mean-reversion family is validated on 10
 * assets but its one documented weakness is lagging strong melt-ups — it sits
 * in cash during rallies. This version adds a SAFE trend-participation leg so
 * it also captures upside, while keeping the defensive band-bounce fully intact.
 * The trend leg only fires in an unambiguous uptrend (price above a rising 50-EMA
 * AND above the 200-SMA), so it cannot whipsaw in bear markets the way a loose
 * ATR-trail trend mode did.
 * When it buys and sells: band-bounce leg buys panic-bottoms (below lower
 * Bollinger(20,2) with RSI<30 above the 200-SMA) and exits at the middle band;
 * trend leg buys pullbacks to a rising 50-EMA above the 200-SMA and exits when
 * price falls back below the 50-EMA or the trend breaks. Both share one position.
 * When it does NOT work: in a choppy sideways market the trend leg incurs small
 * whipsaw losses; in a broad crash below the 200-SMA neither leg buys, so it
 * still loses on any long position carried into the crash.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const ema50 = ctx.ema(50, 1);
  const ema50p = ctx.ema(50, 2);
  if (bb == null || rsi == null || sma200 == null || ema50 == null || ema50p == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    // exits: band-bounce target, RSI overbought, or 6-ATR stop
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    // trend-leg exit: price closes back below the 50-EMA (trend broken)
    if (price < ema50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  const uptrend = price > sma200 && ema50 > ema50p && price > ema50; // rising 50-EMA above 200-SMA

  // TREND leg: in a clean uptrend, buy a pullback to the rising 50-EMA
  // (price within 1 ATR above the EMA = dip, not a panic bottom)
  if (uptrend && atr != null && price >= ema50 && price <= ema50 + atr * 1.0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }

  // BAND-BOUNCE leg: defensive, buys panic-bottom only above the 200-SMA
  if (price < sma200) return null;
  if (price < bb.lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
