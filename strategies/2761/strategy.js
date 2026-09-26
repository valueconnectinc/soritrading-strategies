/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Partial-TP ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A partial-take-profit variant of the RSI-floor
 * Donchian-pullback champion (2760). The champion's documented weakness is
 * that it lags strong melt-ups because it exits the FULL position at the fixed
 * middle Donchian channel. This variant sells HALF at the middle channel to
 * lock the champion's controlled profit, and lets the other half ride with a
 * trailing ATR stop and a trend-break backstop so a melt-up can add return.
 * Bet: the first half preserves the validated edge; the second half captures
 * upside the champion leaves on the table in strong trends.
 * When it buys and sells: same entry as 2760 (pullback to lower 20-bar
 * Donchian, rising 200-SMA >=0.15%/5bars, RSI(14)>30). Exit: sell half at the
 * middle Donchian channel; the remaining half trails at highest-high - 2xATR
 * once 3xATR in profit, and always exits if the 200-SMA stops rising or on a
 * 3xATR hard stop. 5-bar cooldown.
 * When it does NOT work: same as champion — below the 200-SMA it sits out; in
 * a fake/weak uptrend the pullback keeps going; the ridden half can give back
 * profit in a sharp reversal that never re-tests the 200-SMA.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 5);
  if (sma200 == null || sma200prev == null) return null;

  const uptrend = price > sma200 && sma200 > sma200prev;

  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    const dcMid = (ctx.high(20, 1) + ctx.low(20, 1)) / 2;

    // hard floor stop, champion's 3xATR
    if (atr != null && price <= ctx.entryPx - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    // trend-break backstop
    if (!uptrend) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    // PARTIAL TP: sell half at the middle channel to lock champion's profit
    if (dcMid != null && price >= dcMid && ctx.state.tpDone !== 1) {
      ctx.state.tpDone = 1;
      return { side: 'sell', qty: pos * 0.5 };
    }
    // ride the remaining half with a trailing stop once 3xATR in profit
    if (atr != null && ctx.state.tpDone === 1) {
      const profitATR = (price - ctx.entryPx) / atr;
      if (profitATR >= 3) {
        const peak = Math.max(ctx.state.peak || ctx.entryPx, price);
        ctx.state.peak = peak;
        if (price <= peak - atr * 2) {
          ctx.state.lastExit = ctx.i;
          return { side: 'sell', qty: pos };
        }
      }
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
    ctx.state.tpDone = 0;
    ctx.state.peak = 0;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
