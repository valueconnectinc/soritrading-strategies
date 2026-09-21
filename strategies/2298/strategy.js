/*
 * @coinsori-strategy v1
 * name: XRP Band Bounce Trend-Gated
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 1000
 *
 * Bollinger Band mean reversion on a liquid alt, gated by the 200-SMA trend.
 * Bet: liquid altcoins snap back toward the middle band after touching the
 * lower band when RSI is oversold — but only in an uptrend (price above the
 * 200-SMA), which avoids buying falling knives in a persistent downtrend.
 * When it buys: price touches the lower Bollinger band, RSI is oversold
 * (< 35), AND price is above the 200-SMA. When it sells: price reaches the
 * middle band or RSI turns overbought (> 65), or a hard stop protects a
 * real breakdown.
 * When it does NOT work: strong one-way downtrends (we simply stay in cash,
 * missing the bounce but also avoiding losses), and choppy flat regimes where
 * price straddles the 200-SMA and the gate whipsaws. The trend gate also means
 * we sit out most of a bear market — that's the point, but it caps upside if
 * the market turns up sharply from below the SMA.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || rsi == null || sma200 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;
  const entry = ctx.entryPx || 0;

  // Hard stop: exit if price fell 12% below entry (real breakdown, not a bounce)
  if (pos > 0 && entry > 0 && px < entry * 0.88) {
    return { side: 'sell', qty: pos };
  }

  // Buy at lower band with oversold RSI, only in an uptrend (above 200-SMA)
  if (pos === 0 && px <= bb.lower && rsi < 35 && px > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit at middle band or overbought RSI
  if (pos > 0 && (px >= bb.mid || rsi > 65)) {
    return { side: 'sell', qty: pos };
  }

  return null;
}
