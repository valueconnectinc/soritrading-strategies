/*
 * @coinsori-strategy v1
 * name: Improved SMA RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy improves on the basic SMA/RSI mean reversion by adding volume and macro filters to reduce false signals.
 * When it buys and sells: It buys when price is below SMA and RSI is oversold, with high volume and bullish macro trends. It sells when price is above SMA and RSI is overbought, with high volume and bearish macro trends.
 * When it does NOT work: In strong trending markets, the strategy may miss opportunities or get stopped out due to false signals from poor filtering.
 */

function onUpdate(ctx) {
  // === INDICATORS AND DATA ===
  const sma = ctx.sma(20);
  const rsi = ctx.rsi(14);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);

  // === FETCH MACRO DATA ===
  const fearGreed = ctx.data('fear_greed');

  // === FILTERS ===
  if (sma == null || rsi == null || vol == null || avgVol == null || fearGreed == null) {
    return null;
  }

  // Volume filter: only trade when volume is above average
  const volumeFilter = vol > avgVol * 1.2;

  // Fear and Greed index filter:
  // - Buy when index is below 30 (fear)
  // - Sell when index is above 70 (greed)
  const fearFilter = fearGreed < 30;
  const greedFilter = fearGreed > 70;

  // === TRADING LOGIC ===
  if (ctx.position == 0) {
    // Not in a position, check for buy signal
    if (ctx.price < sma && rsi < 30 && volumeFilter && fearFilter) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else {
    // In a position, check for sell signal
    if (ctx.price > sma && rsi > 70 && volumeFilter && greedFilter) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
