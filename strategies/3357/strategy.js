/*
 * @coinsori-strategy v1
 * name: SOL Fear-Reset Recovery 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Crypto Fear & Greed Index (0=extreme fear, 100=extreme greed) is a
 * crowd-sentiment gauge. Crypto recoveries usually start when the index turns up from a
 * fearful zone — buying that reset catches the start of a recovery rally instead of trying to
 * buy the exact bottom. A trailing stop then rides the recovery while capping give-back.
 * When it buys and sells: Buys the day the index crosses back up through 25 (fear receding)
 * while price is above the 200-day average. Sells when the index reaches 85 (bubble-level
 * greed), price falls 2.0 ATR below the highest close since entry, or after 60 days.
 * When it does NOT work: A dead-cat bounce prints one reset signal then keeps falling — the
 * trend gate and stop limit the damage but do not prevent it. The index is BTC-driven, so a
 * SOL-only move can reset without a real recovery. No SOL data before Aug 2020.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const fg = ctx.data('fear_greed');
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (!Number.isFinite(price) || price <= 0) return null;
  if (fg == null || sma200 == null || atr == null) return null;   // data gap or warm-up

  const st = ctx.state;
  const pos = ctx.position;
  const fgPrev = st.fgPrev;   // sentiment of the previous bar (stored below)

  if (pos <= 0) {
    if (st.cooldownUntil != null && ctx.i < st.cooldownUntil) return null;
    // Fear-reset: index crossed UP through 25 (was fearful, now recovering) inside an uptrend.
    if (fgPrev != null && fgPrev < 25 && fg >= 25 && price > sma200) {
      st.entryBar = ctx.i;
      st.entryPx = price;
      st.peak = price;
      st.fgPrev = fg;
      ctx.watch([{ side: 'sell', price: price - 2.0 * atr, trigger: 'below', note: '2 ATR trail' }]);
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    st.fgPrev = fg;
    return null;
  }

  if (price > st.peak) st.peak = price;
  const trail = st.peak - 2.0 * atr;
  const barsHeld = ctx.i - (st.entryBar || ctx.i);
  ctx.watch([{ side: 'sell', price: trail, trigger: 'below', note: '2 ATR trail' }]);
  // Exit on bubble greed (contrarian take-profit), the trailing stop, or a 60-day limit.
  if (fg >= 85 || price <= trail || barsHeld >= 60) {
    st.cooldownUntil = ctx.i + 10;
    st.fgPrev = fg;
    return { side: 'sell', qty: pos };
  }
  st.fgPrev = fg;
  return null;
}
