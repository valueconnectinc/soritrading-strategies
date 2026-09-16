/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion with ATR Filter
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses Bollinger Bands for mean reversion entry points and adds an ATR filter to avoid
 * entering trades during high volatility periods. The strategy buys when the price touches the lower Bollinger_band
 * and sells when it touches the upper band, while filtering out trades based on ATR levels.
 *
 * When it buys: It enters long when price touches the lower Bollinger Band and ATR is not too high (low volatility).
 * When it sells: It exits long positions when price touches the upper Bollinger Band.
 * When it does NOT work: The strategy underperforms in strongly trending markets where price doesn't retrace to bands,
 * or in extremely low volatility situations where the ATR filter blocks most trades.
 */

function onUpdate(ctx) {
  // --- Get indicators ---
  const bb = ctx.bb(20, 2, 0);
  const bb_prev = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 0);
  const atr_prev = ctx.atr(14, 1);

  // --- Guard against null values ---
  if (bb == null || bb_prev == null || atr == null || atr_prev == null) {
    return null;
  }

  // --- Define conditions ---
  const price = ctx.price;
  const lowerBand = bb.lower;
  const upperBand = bb.upper;

  // Buy condition: Price touches or crosses lower Bollinger Band, and ATR is below threshold (low volatility)
  const buyCondition = (price <= lowerBand) && (atr < atr_prev * 1.5); 

  // Sell condition: Price touches or crosses upper Bollinger Band
  const sellCondition = price >= upperBand;

  // --- Entry logic ---
  if (buyCondition && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // --- Exit logic ---
  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // --- No action ---
  return null;
}
