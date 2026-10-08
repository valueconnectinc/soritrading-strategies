/*
 * @coinsori-strategy v1
 * name: BTC 1D Keltner MR + On-Chain Growth Filter
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy:
 * Combines the proven Keltner mean-reversion recipe with an on-chain regime filter:
 * only buy oversold dips when the network is genuinely growing (30-day avg active
 * addresses rising). MR dips in a shrinking network are falling knives; dips in a
 * growing network revert. This is a different filter (on-chain) than the sentiment
 * gate, which was a no-op.
 * When it buys and sells:
 * Buys when previous close pierced below Keltner lower band (EMA20 - 2.5ATR) with
 * RSI<40 AND 30-day avg active addresses rising. Sells at mid-band EMA20. 2-bar cooldown.
 * When it does NOT work:
 * Strong one-directional moves never revert. If addresses keep rising while price
 * already peaked, MR entries keep firing into a late-cycle top. Lags buy-and-hold
 * in melt-ups.
 */
function onUpdate(ctx) {
  const ema = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  const price = ctx.price;
  const addrSma = ctx.data('addr_sma30');
  if (ema == null || atr == null || rsi == null || price == null || addrSma == null) return null;

  const prevAddrSma = ctx.state.prevAddrSma;
  ctx.state.prevAddrSma = addrSma;
  const networkGrowing = prevAddrSma != null && addrSma > prevAddrSma;

  const lower = ema - 2.5 * atr; // validated recipe band width

  ctx.watch([
    { side: 'buy', price: lower, note: 'Keltner lower band' },
    { side: 'sell', price: ema, note: 'mid-band target' }
  ]);

  if (ctx.position > 0) {
    if (price >= ema) {
      ctx.state.lastExitBar = ctx.i;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (ctx.state.lastExitBar != null && ctx.i - ctx.state.lastExitBar < 2) return null;

  const rsiPrev = ctx.rsi(14, 2);
  if (rsiPrev == null) return null;
  if (rsi < 40 && ctx.closes[ctx.closes.length - 2] <= lower && networkGrowing) {
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
