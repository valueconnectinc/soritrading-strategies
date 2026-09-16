/*
 * @coinsori-strategy v1
 * name: MACD Trend Filter Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines mean reversion with a MACD trend filter to avoid entering trades during strong trends. It aims to reduce drawdowns by exiting positions when the overall trend is against us, while still capturing mean-reverting behavior in ranging markets.
 * When it buys and sells: It buys when price is below Bollinger Band lower band and MACD histogram is positive (indicating a potential reversal). It sells when price is above the upper Bollinger Band and MACD histogram is negative, signaling a potential reversal down.
 * When it does NOT work: The strategy fails in strong trending markets where mean reversion doesn't occur, as it relies on price reverting to its mean. Additionally, frequent whipsaws can cause unnecessary losses. It also performs poorly when the MACD signal is unreliable.
 */

function onUpdate(ctx) {
  // Get required indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const prevMacd = ctx.macd(12, 26, 9, 1);
  const bb = ctx.bb(20, 2, 0);
  const prevBb = ctx.bb(20, 2, 1);

  // Ensure indicators are ready
  if (macd == null || prevMacd == null || bb == null || prevBb == null) {
    return null;
  }

  // Get latest closing prices and position
  const price = ctx.price;
  const position = ctx.position;
  const cash = ctx.cash;

  // Calculate signals:
  // MACD histogram for current and previous bar
  const macdHistogram = macd.histogram;
  const prevMacdHistogram = prevMacd.histogram;

  // Bollinger Band values
  const bbLower = bb.lower;
  const bbUpper = bb.upper;
  const prevBbLower = prevBb.lower;
  const prevBbUpper = prevBb.upper;

  // Signal conditions:
  // Buy condition: Price is below lower BB AND MACD histogram is positive (reversal signal)
  // Sell condition: Price is above upper BB AND MACD histogram is negative (reversal signal)

  const buyCondition = price < bbLower && macdHistogram > 0 && prevMacdHistogram <= 0;
  const sellCondition = price > bbUpper && macdHistogram < 0 && prevMacdHistogram >= 0;

  // Exit condition: Close if in a position and opposite signal occurs
  if (position > 0) {
    // If we are long, and sell condition is met, close the position
    if (sellCondition) {
      return { side: 'sell', qty: position };
    }
  } else if (position < 0) {
    // If we are short, and buy condition is met, close the position
    if (buyCondition) {
      return { side: 'buy', qty: Math.abs(position) };
    }
  } else {
    // No position open, check for entry conditions
    if (buyCondition) {
      // Calculate quantity to buy - 99% of cash
      const qty = cash / price * 0.99;
      return { side: 'buy', qty: qty };
    } else if (sellCondition) {
      // Calculate quantity to sell - 99% of position size or max available
      const qty = Math.min(cash / price * 0.99, 1000); // Cap at max 1000 contracts for shorting
      return { side: 'sell', qty: qty };
    }
  }

  return null;
}
