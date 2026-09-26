/*
 * @coinsori-strategy v1
 * name: BTC 1D Regime-Switch Blend, MR Exit Loosened
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same regime-switch blend as the champion, but with the
 * mean-reversion exit loosened (sell at RSI>60 instead of RSI>50, or above
 * the upper band instead of the mid band). The idea is that in a strong
 * panic snap-back the champion sells too early and leaves money on the table,
 * so letting the bounce run a bit longer should capture more of the recovery
 * in chop-heavy windows.
 * When it buys and sells: identical to the champion — trend mode above the
 * 200-day (pullbacks to the Donchian channel, trailing stop), mean-reversion
 * mode below the 200-day (RSI<30 at the lower Bollinger band) — but the
 * mean-reversion mode exits later.
 * When it does NOT work: same as the champion — whipsaw in sideways markets,
 * weak bounces in grinding downtrends, and lagging straight-line melt-ups.
 * Loosening the MR exit also risks giving back gains if a bounce reverses
 * before RSI reaches 60.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const st = ctx.state;

  // --- Exit ---
  if (pos > 0) {
    if (st.mode === 'trend' && price < sma200) {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    if (st.mode === 'trend') {
      const atr = ctx.atr(14, 1);
      if (atr == null) return null;
      const peak = Math.max(st.peak || ctx.entryPx || price, price);
      st.peak = peak;
      if (price <= peak - 8 * atr) {
        st.peak = null; st.mode = null;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    const bb = ctx.bb(20, 2, 1), rsi = ctx.rsi(14, 1);
    if (bb == null || rsi == null) return null;
    // LOOSENED MR EXIT: let the bounce run to RSI>60 or above the upper band.
    if (rsi > 60 || price > bb.upper) {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    const stopPx = st.peak != null ? st.peak * 0.75 : (ctx.entryPx || price) * 0.75;
    if (price < stopPx) {
      st.mode = null; st.peak = null;
      return { side: 'sell', qty: pos };
    }
    if (price > (st.peak || 0)) st.peak = price;
    return null;
  }

  // --- Entry ---
  const bb = ctx.bb(20, 2, 1), rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || rsi == null || atr == null) return null;

  if (price > sma200) {
    const hi10 = ctx.high(10, 1), lo20 = ctx.low(20, 1);
    const hi10prev = ctx.high(10, 2);
    if (hi10 == null || lo20 == null || hi10prev == null) return null;
    if (price <= lo20 && hi10 > hi10prev) {
      st.mode = 'trend'; st.peak = price;
      return { side: 'buy', qty: ctx.cash / price * 0.9 };
    }
    return null;
  }

  if (rsi < 30 && price <= bb.lower) {
    st.mode = 'mr'; st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
