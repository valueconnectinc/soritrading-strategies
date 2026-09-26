/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Trend-Strength 0.10 ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Robustness check for the improved Donchian-pullback
 * champion (2759). Same logic but a LOOSER trend-strength gate (0.10% instead
 * of 0.15%) to confirm the improvement is not a knife-edge pick of the
 * threshold. If 0.10% behaves similarly across windows, the gate is robust.
 * When it buys and sells: identical to 2759 except the 200-SMA must rise at
 * least 0.10% over 5 bars before a pullback entry (vs 0.15%).
 * When it does NOT work: same as the champion — below the 200-SMA it sits
 * out; in a fake/weak uptrend the pullback keeps going.
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
  if (rise < 0.0010) return null;

  const dcLow = ctx.low(20, 1);
  if (dcLow != null && price <= dcLow * 1.01) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
