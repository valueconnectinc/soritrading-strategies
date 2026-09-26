/*
 * @coinsori-strategy v1
 * name: BTC 1D Pure Band-Bounce Champion (control)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Control version of the band-bounce mean-reversion family
 * WITHOUT the trend-scaled bull loosening. Buys only deep-oversold panic
 * bottoms (RSI<30 at/below the lower Bollinger band) while price is above the
 * 200-day average. Used to isolate whether the loosening (in the other
 * strategy) helps or hurts on BTC 1d.
 * When it buys and sells: buys RSI<30 at/below lower band above the 200-day;
 * sells on RSI>50 recovery or price back above the middle band, or hard stop.
 * When it does NOT work: in a persistent bear it stays in cash; it lags
 * straight-line bulls because it waits for deep pullbacks.
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
  if (rsi < 30 && price <= bb.lower) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
