/*
 * @coinsori-strategy v1
 * name: BTC 1D Trend-Scaled Band-Bounce Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's price regularly overreacts downward to fear
 * (panic flushes below the lower Bollinger band), then snaps back toward the
 * average. Buying only deep-oversold panic bottoms inside a bull trend has
 * been the single most robust edge across many assets. The weakness of that
 * strict rule is that it sits in cash during strong melt-ups; this version
 * loosens the entry when price is far above the 200-day average so it also
 * catches pullbacks in raging bulls.
 * When it buys and sells: buys when price is deep oversold (RSI<30) at/below
 * the lower Bollinger band while price is above the 200-day average; in a
 * strong bull (price 30%+ above the 200-day) it also buys shallower pullbacks
 * (RSI<45 to the middle band). Sells when RSI recovers above 50 or price
 * closes back above the middle band, or on a hard stop.
 * When it does NOT work: in a persistent bear market below the 200-day average
 * it stays mostly in cash (safe but no upside); and in a grinding downtrend
 * that keeps making lower lows the oversold bounces can be weak. It also lags
 * a straight-line bull because it waits for pullbacks rather than chasing.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  const sma20 = ctx.sma(20, 1);
  if (bb == null || rsi == null || sma200 == null || sma20 == null) return null;
  if (bb.lower == null || bb.mid == null) return null;

  const st = ctx.state;

  // --- Exit logic (same for both entry modes) ---
  if (pos > 0) {
    // Exit on RSI recovery to 50 (bounce has exhausted) or price back above the middle band.
    if (rsi > 50 || price > bb.mid) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    // Hard stop: give the bounce room but cut a failed bounce at 25% below entry.
    const stopPx = st.peak != null ? st.peak * 0.75 : (ctx.entryPx || price) * 0.75;
    if (price < stopPx) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    if (price > (st.peak || 0)) st.peak = price;
    return null;
  }

  // --- Entry ---
  // Only buy inside a bull regime (price above the 200-day average).
  if (price <= sma200) return null;

  // How far above the long average are we? Strong bull = melt-up regime.
  const bullStrength = (price - sma200) / sma200;

  if (bullStrength >= 0.30) {
    // Strong bull: loosen entry to RSI<45 and a pullback to the middle band,
    // so we deploy capital in melt-ups the strict rule would miss.
    if (rsi < 45 && price <= bb.mid) {
      st.peak = price;
      return { side: 'buy', qty: ctx.cash / price * 0.5 };
    }
    return null;
  }

  // Normal bull: strict deep-oversold panic-bottom entry only.
  if (rsi < 30 && price <= bb.lower) {
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.5 };
  }
  return null;
}
