/*
 * @coinsori-strategy v1
 * name: SOL-XRP 4H Keltner MR (ungated, A/B)
 * ex: binance
 * syms: SOLUSDT, XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A/B control for the trend-gated version. Base Keltner MR without the
 * rising-200bar gate, to isolate whether the gate improves drawdown.
 * When it buys and sells: buy below EMA20-2.5ATR with RSI<40, sell above EMA20.
 * When it does NOT work: in downtrends it buys falling knives (higher drawdown).
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (ema20 == null || atr == null || atr <= 0 || rsi == null) return null;

  const pos = ctx.pos(sym);
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if (price > ema20 && cd === 0) {
      ctx.state.cd = 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const keltnerLow = ema20 - 2.5 * atr;
  if (price < keltnerLow && rsi < 40 && cd === 0) {
    ctx.state.cd = 2;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
