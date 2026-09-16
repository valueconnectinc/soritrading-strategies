/*
 * @coinsori-strategy v1
 * name: Trend Following with MACD
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: In strong trending markets, momentum strategies can be effective. This implementation uses MACD to identify trend direction, combined with a moving average filter to avoid false signals in ranging markets.
 * When it buys and sells: It buys on a bullish MACD crossover when the price is above a 50-period exponential moving average (Trend Filter). It sells when there's a bearish crossover and the price is below the EMA50.
 * When it does NOT work: This strategy may fail in sideways or choppy markets where momentum signals are weak. It also might miss early entries during strong trends because of the trend filter.
 */

function onUpdate(ctx) {
  // === INPUTS ===
  const fast = 12;
  const slow = 26;
  const signal = 9;
  const emaLength = 50;

  // === INDICATORS ===
  const macd = ctx.macd(fast, slow, signal, 0);
  const macdPrev = ctx.macd(fast, slow, signal, 1);
  const ema50 = ctx.ema(emaLength, 0);

  // === SAFETY CHECKS ===
  if (macd == null || macdPrev == null || ema50 == null) {
    return null;
  }

  // === BUY LOGIC ===
  // Buy on bullish MACD cross above signal line and price is above EMA50 (trend filter)
  const buyCondition = macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal && ctx.price > ema50;

  // === SELL LOGIC ===
  // Sell on bearish MACD cross below signal line and price is below EMA50 (trend filter)
  const sellCondition = macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal && ctx.price < ema50;

  if (buyCondition && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // === NO TRADE ===
  return null;
}
