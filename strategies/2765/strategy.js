/*
 * @coinsori-strategy v1
 * name: Donchian Pullback RSIFloor XRP 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Generalization test of the validated champion recipe
 * (RSI-floor Donchian-pullback, id 2760) onto a FOURTH asset, XRP 4h. The
 * champion validated on BTC/ETH/SOL; this checks whether the edge is truly
 * asset-independent or specific to the majors.
 * When it buys and sells: buys when price pulls back to the lower 20-bar
 * Donchian channel while price > rising 200-SMA and RSI(14) > 30; sells at the
 * middle Donchian channel, when the 200-SMA stops rising, or on a 3x-ATR stop.
 * 5-bar cooldown.
 * When it does NOT work: below the 200-SMA it sits out; in a fake/weak uptrend
 * the pullback keeps going. XRP's lower volatility and different microstructure
 * may not support the same edge.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;

  const uptrend = price > sma200 && sma200 > sma200prev;

  if (pos > 0) {
    const dcMid = (ctx.high(20, 1) + ctx.low(20, 1)) / 2;
    if (dcMid != null && price >= dcMid) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    if (!uptrend) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;
  if (!uptrend) return null;

  const rise = (sma200 - sma200prev) / sma200prev;
  if (rise < 0.0015) return null;

  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;
  if (rsi < 30) return null;

  const dcLow = ctx.low(20, 1);
  if (dcLow != null && price <= dcLow * 1.01) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
