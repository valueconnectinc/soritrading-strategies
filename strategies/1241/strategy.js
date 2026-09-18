/*
 * @coinsori-strategy v1
 * name: SMA Crossover + Volume Filter — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Pure trend-following on BTCUSDT 4H: buy when SMA 20 crosses above SMA 50
 * on above-average volume, sell on the reverse cross. Simple and robust —
 * fewer filters means more signals even on sparse 4H bars.
 * Works in sustained BTC trends. Fails in choppy markets with frequent
 * SMA crosses and in sharp reversals where the cross lags.
 */
function onUpdate(ctx) {
  const sma20 = ctx.sma(20);
  const sma50 = ctx.sma(50);
  if (sma20 == null || sma50 == null) return null;

  // Volume confirmation: today's volume must be above its 20-bar average
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volConfirm = ctx.vol > avgVol;

  const position = ctx.position;
  const price    = ctx.price;

  // === ENTRY: SMA golden cross + volume confirm ===
  if (!position) {
    const sma20Prev = ctx.sma(20, 1);
    const sma50Prev = ctx.sma(50, 1);
    if (sma20Prev == null || sma50Prev == null) return null;

    const crossUp = sma20Prev <= sma50Prev && sma20 > sma50;

    if (crossUp && volConfirm) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // === EXIT: SMA death cross ===
  if (position) {
    const sma20Prev = ctx.sma(20, 1);
    const sma50Prev = ctx.sma(50, 1);
    if (sma20Prev == null || sma50Prev == null) return null;

    const crossDown = sma20Prev >= sma50Prev && sma20 < sma50;

    if (crossDown) {
      return { side: 'sell', qty: position };
    }
  }

  return null;
}
