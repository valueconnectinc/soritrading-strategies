/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The fear & greed index measures crowd sentiment. Crowds are most
 * wrong at the extremes: extreme fear marks capitulation bottoms, extreme greed marks
 * euphoric tops. Buying fear and selling greed is the classic contrarian bet and uses a
 * sentiment signal, not price indicators.
 * When it buys and sells: Buy when the index is in extreme fear (<= 20) and price is
 * still above its 200-day average (so we only buy fear in an intact uptrend, not a
 * bear market). Sell when the index reaches greed (>= 70) or price breaks below the
 * 200-day average.
 * When it does NOT work: In a prolonged bear market extreme fear keeps recurring and the
 * 200-day filter holds us out (so we miss the bottom and only re-enter late); and the
 * index is slow-moving so it cannot catch quick intraday reversals.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 205) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma200 = ctx.sma(200, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  if (px == null || sma200 == null || px <= 0) return null;

  const fg = ctx.data('fear_greed'); // 0-100 sentiment index
  if (fg == null) return null; // unknown sentiment -> do nothing

  if (pos === 0) {
    // Buy extreme fear only in an intact uptrend (price above 200-day average).
    if (fg <= 20 && px > sma200 && cash > 0 && ctx.price > 0) {
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // Sell on extreme greed, or if the long-term uptrend breaks.
  if (fg >= 70 || px < sma200) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
