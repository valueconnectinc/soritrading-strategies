/*
 * @coinsori-strategy v1
 * name: XRP 1D Dip-Buy RSI2
 * ex: binance
 * syms: XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: in a confirmed long-term uptrend, short sharp dips are
 * usually buying opportunities, not trend changes. RSI(2) flags those extreme
 * dips better than any longer RSI.
 * When it buys and sells: buys only when price is above the 200-day average
 * (uptrend intact) AND the 2-bar RSI is deeply oversold (< 15). Sells when the
 * 2-bar RSI is overbought (> 75) or price closes back below the 200-day average.
 * When it does NOT work: in a bear market the 200-day filter is off, so no
 * trades — but if the trend filter is too loose it catches falling knives in
 * prolonged downtrends. Also misses entire rallies with no dips.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const close = ctx.price;

  const sma200 = ctx.sma(200, 1);
  const rsi2 = ctx.rsi(2, 1);
  if (sma200 == null || rsi2 == null) return null;

  // Exit: overbought or trend broken.
  if (pos > 0 && (rsi2 > 75 || close < sma200)) {
    return { side: 'sell', qty: pos };
  }

  // Buy: uptrend intact AND deep 2-bar RSI dip.
  if (pos === 0 && close > sma200 && rsi2 < 15) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
