/*
 * @coinsori-strategy v1
 * name: BTC 1D Addr Diagnostic (any-data)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: DIAGNOSTIC ONLY — checks whether ctx.data('addr') actually
 *   loads in the backtest environment. Trades on ANY positive addr value to
 *   confirm the data feed, not as a real strategy.
 * When it buys and sells: Buys whenever addr>0 and price>200d SMA; exits on
 *   3x ATR trail. Used purely to confirm data presence.
 * When it does NOT work: Not a real strategy.
 */
function onUpdate(ctx) {
  const addr = ctx.data('addr');
  if (addr == null) return null;
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    if (price < s.highest - 3 * atr) return { side: 'sell', qty: pos };
    return null;
  }
  if (addr > 0 && price > sma200) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
