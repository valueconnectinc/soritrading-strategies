/*
 * @coinsori-strategy v1
 * name: ADA Keltner MR 4H
 * ex: binance
 * syms: ADAUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Tests whether the ATR-adaptive Keltner mean-reversion recipe
 * (validated positive on SOL/XRP/ETH 4h) also holds on ADA 4h — a genuinely new
 * asset data point for this family. It buys deep pullbacks and sells snap-backs.
 * When it buys and sells: buys when price closes below EMA20 minus 2.5x ATR with
 * RSI(14)<40 (a real pullback, not a falling knife); sells when price closes back
 * above the 20-EMA (channel mid). A 2-bar cooldown after any trade cuts whipsaw.
 * When it does NOT work: in a straight-line melt-up it sits in cash and lags
 * buy-and-hold; the RSI<40 filter can still buy a knife in a violent bear. It is
 * a defensive pullback strategy, not a momentum chaser.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null) return null;

  const pos = ctx.position;
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  st.cd = cd;

  if (pos > 0) {
    // Exit once price recovers above the 20-EMA (channel mid). No hard stop:
    // the mid-band exit is what makes this recipe work (a hard stop whipsaws on 4h).
    if (price > ema20 && cd === 0) {
      st.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr; // 2.5 ATR below EMA20 = volatility-adaptive lower band
  if (price < keltnerLow && rsi < 40 && cd === 0) {
    st.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
