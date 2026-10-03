/*
 * @coinsori-strategy v1
 * name: BTC 4H Keltner MR
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ATR-adaptive Keltner mean-reversion recipe is a validated
 * cross-asset family (positive on ETH/BTC/SOL 4h windows). On BTC 4h it beats buy-and-hold
 * on all 3 disjoint windows with moderate drawdown, buying volatility-adaptive pullbacks.
 * When it buys and sells: buys when BTC closes below EMA20 minus 2.5x ATR with RSI(14)<40;
 * sells when price recovers above the 20-EMA. 2-bar cooldown cuts whipsaw.
 * When it does NOT work: in a strong melt-up it sits in cash and lags buy-and-hold; in a
 * sustained downtrend the dips keep dipping, so it needs the pullback to actually revert.
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
