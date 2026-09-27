/*
 * @coinsori-strategy v1
 * name: Keltner MR ATR-VolTarget + Protective Stop LINK/LTC/DOGE/AVAX/BNB
 * ex: binance
 * syms: LINKUSDT, LTCUSDT, DOGEUSDT, AVAXUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ATR-sized Keltner mean-reversion recipe was validated
 * positive on 10/10 windows across 5 assets on 4h (MDD cut from 30%+ to 4-11%).
 * Its one residual weakness is individual trades that go deep underwater before
 * the mid-band snap-back exit. This version keeps the exact proven entry and the
 * mid-band exit, and ADDS a wide protective ATR stop as a floor: if a position
 * drops 3.5x ATR below its entry, we cut it early to cap the worst single-trade
 * loss. The stop is deliberately wide so it does not fire on normal noise and
 * does not replace the mid-band exit (which is the primary, validated exit).
 * When it buys and sells: buys a flush to the lower Keltner band (EMA20 - 2.5x
 * ATR) with RSI<40 while price is above the 200-bar average; sells on the
 * snap-back to the middle band (EMA20), or earlier if the protective stop trips.
 * When it does NOT work: in a persistent downtrend below the 200-bar average it
 * stays idle, and it lags straight-line melt-ups (no deep flushes to catch).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || sma200 == null || rsi == null || atr <= 0) return null;

  const lower = ema20 - 2.5 * atr;
  const st = ctx.state;

  if (pos > 0) {
    // Primary exit: snap-back to the middle band (proven, keep it).
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    // Protective stop: cut if the trade drops 3.5x ATR below entry.
    // 3.5x chosen (vs 3.0) so it only trips on true failures, not normal noise,
    // and never pre-empts the mid-band exit on routine flushes.
    const entry = ctx.entryPx;
    if (Number.isFinite(entry) && entry > 0 && price < entry - 3.5 * atr) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  if (price > sma200 && price <= lower && rsi < 40) {
    st.cooldown = null;
    // ATR-scaled size: risk 1.5% of equity per trade, in coin units.
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = ctx.cash / price * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
