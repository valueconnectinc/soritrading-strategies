/*
 * @coinsori-strategy v1
 * name: Simple Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy applies a simple mean reversion approach using RSI and Bollinger Bands. It buys when the price is below the lower band and RSI is less than 30, and sells when it's above the upper band and RSI is greater than 70.
 * When it buys and sells: Buys when price dips below the lower Bollinger Band and RSI < 30. Sells when price rises above the upper Bollinger Band and RSI > 70.
 * When it does NOT work: This strategy will not perform well in strong trending markets where prices do not revert to the mean for extended periods.
 */

function onUpdate(ctx) {
  // 데이터 로드
  const price = ctx.price;
  const rsi = ctx.rsi(14, 0);
  const bb = ctx.bb(20, 2, 0);

  // 지표가 충분히 존재하는지 확인 (warm-up 처리)
  if (rsi == null || bb == null) {
    return null;
  }

  // 매수 조건: RSI < 30 AND price < lower band
  if (rsi < 30 && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // 매도 조건: RSI > 70 AND price > upper band
  if (rsi > 70 && price > bb.upper) {
    return { side: 'sell', qty: ctx.position };
  }

  // 포지션 없이 매도 시그널을 받은 경우
  return null;
}
