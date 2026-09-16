/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with Macro Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy attempts to exploit mean reversion opportunities in BTCUSDT using the RSI indicator, while filtering trades based on volume and macro sentiment data to avoid trades during low-activity or volatile periods.
 * When it buys and sells: It buys when RSI drops below 30 (oversold) and sells when RSI rises above 70 (overbought), subject to volume and macro conditions.
 * When it does NOT work: This strategy may underperform in strong trending markets or when the RSI indicator fails to predict reversals correctly, especially during high volatility periods.
 */

function onUpdate(ctx) {
  // Get indicators
  const rsi = ctx.rsi(14);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;
  
  // Get macro data — use fear and greed index from dataset
  const fg = ctx.data('fear_greed');
  
  // Guard against null values
  if (rsi == null || vol == null || avgVol == null || fg == null) {
    return null;
  }

  // Define conditions for a trade
  const isOverbought = rsi > 70;
  const isOversold = rsi < 30;
  
  // Volume filter: Only trade when volume exceeds twice the average volume
  const volumeFilter = vol > avgVol * 2;

  // Macro sentiment filter: Avoid trading during extreme fear or greed
  const macroFilter = fg > 20 && fg < 80;

  // Buy condition: RSI oversold and volume is high and macro sentiment is neutral
  if (isOversold && volumeFilter && macroFilter) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: RSI overbought and volume is high and macro sentiment is neutral
  if (isOverbought && volumeFilter && macroFilter) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
