/*
 * @coinsori-strategy v1
 * name: BTC 4H Trend-Scaled Band-Bounce Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: On the 4-hour timeframe the band-bounce mean-reversion
 * family is the single most robust edge found across many assets (buy deep
 * panic flushes below the lower Bollinger band inside a bull trend, ride the
 * snap-back). Its known weakness is that it sits in cash during strong
 * melt-ups. This version adds a trend-scaled loosening: when price is far
 * above the 200-period average it also buys shallower pullbacks to the middle
 * band, so it captures raging bulls without giving up the bear defense.
 * When it buys and sells: buys when price is deep oversold (RSI<30) at/below
 * the lower Bollinger band while price is above the 200-period average; in a
 * strong bull (price 30%+ above the 200-period) it also buys shallower
 * pullbacks (RSI<45 to the middle band). Sells when RSI recovers above 50 or
 * price closes back above the middle band, or on a hard stop.
 * When it does NOT work: in a persistent bear below the 200-period average it
 * stays mostly in cash; in a grinding downtrend the oversold bounces can be
 * weak; and it lags a straight-line bull because it waits for pullbacks.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  if (bb.lower == null || bb.mid == null) return null;

  const st = ctx.state;

  if (pos > 0) {
    if (rsi > 50 || price > bb.mid) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    const stopPx = st.peak != null ? st.peak * 0.75 : (ctx.entryPx || price) * 0.75;
    if (price < stopPx) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    if (price > (st.peak || 0)) st.peak = price;
    return null;
  }

  if (price <= sma200) return null;

  const bullStrength = (price - sma200) / sma200;
  if (bullStrength >= 0.30) {
    if (rsi < 45 && price <= bb.mid) {
      st.peak = price;
      return { side: 'buy', qty: ctx.cash / price * 0.5 };
    }
    return null;
  }

  if (rsi < 30 && price <= bb.lower) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
