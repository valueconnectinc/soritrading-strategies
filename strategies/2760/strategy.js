/*
 * @coinsori-strategy v1
 * name: Donchian Pullback Trailing-Exit ETH 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Improvement on the RSI-floor Donchian-pullback champion
 * (2760). Same trend-pullback entry (buy a pullback to the lower 20-bar
 * Donchian channel in a rising-200-SMA uptrend with an RSI(14)>30 floor), but
 * the EXIT changes: instead of selling at the fixed middle Donchian channel,
 * it uses a trailing ATR stop that only arms once the trade is meaningfully in
 * profit. Bet: the champion's documented weakness is that it lags strong
 * melt-ups because the fixed middle-channel target caps winners too early; a
 * trailing stop lets winners run in strong trends while a trend-break backstop
 * still protects in chop.
 * When it buys and sells: same entry as 2760. Exit: once price has risen
 * >=3xATR above entry, a trailing stop trails at (highest high - 2xATR);
 * also exits immediately if the 200-SMA stops rising, or on a 3xATR hard stop.
 * 5-bar cooldown.
 * When it does NOT work: same as champion — below the 200-SMA it sits out;
 * in a fake/weak uptrend the pullback keeps going; the trailing exit can give
 * back profit in a sharp reversal that never re-tests the 200-SMA.
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
    if (atr != null) {
      // hard stop: keep the champion's 3xATR floor stop
      if (price <= ctx.entryPx - atr * 3) {
        ctx.state.lastExit = ctx.i;
        return { side: 'sell', qty: pos };
      }
      // trailing stop arms only once profit >= 3xATR above entry, then trails
      // at highest-high - 2xATR. Lets melt-ups run instead of capping at the
      // middle channel (the champion's documented lag weakness).
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
    // trend-break backstop: if the 200-SMA stops rising, leave
    if (!uptrend) {
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
