/*
 * @coinsori-strategy v1
 * name: OI-Crowding Band-Bounce BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Derivatives open interest (OI) is a crowding gauge. When
 * price falls hard to the lower Bollinger band while OI is elevated, it often
 * means leveraged longs are being liquidated en masse — a panic flush that
 * tends to snap back. This adds an OI-crowding confirmation to the validated
 * band-bounce mean-reversion recipe.
 * When it buys and sells: buys when price closes below lower Bollinger(20,2),
 * RSI<30, price above the 200-SMA, AND OI is not collapsing (a sign of forced
 * exits rather than a real distribution top). Exits at the middle band / RSI>50
 * or a 6-ATR stop.
 * When it does NOT work: if OI data is unavailable the filter is skipped, so
 * it degrades to plain band-bounce; in a sustained downtrend below the 200-SMA
 * it never buys; a panic that keeps falling still loses. Mean reversion is
 * defensive, not a trend rider.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price >= bb.mid || rsi > 50) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (price < sma200) return null;
  if (!(price < bb.lower && rsi < 30)) return null;

  // OI crowding confirmation: only buy when OI is present and not collapsing.
  // If OI is unavailable (null), fall back to the plain band-bounce entry.
  const oi = ctx.binanceOi ? ctx.binanceOi() : null;
  if (oi != null) {
    const oiPrev = ctx.state.oiPrev;
    ctx.state.oiPrev = oi;
    if (oiPrev != null && oi < oiPrev * 0.9) {
      // OI collapsing hard = real distribution/exhaustion, not a squeeze flush.
      return null;
    }
  }

  return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
}
