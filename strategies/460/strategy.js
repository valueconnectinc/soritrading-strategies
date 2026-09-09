/*
 * @coinsori-strategy v1
 * name: MACD + RSI 조합 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: MACD와 RSI의 신호를 모두 확인하여 강력한 진입 신호를 얻으려 함. MACD는 추세를, RSI는 과매수/과매도 상황을 판단함.
 * 언제 사고 언제 파는가: MACD의 매도 신호가 발생하고 RSI가 과매수 상황일 때 매도, 반대로 MACD의 매수 신호가 발생하고 RSI가 과매도일 때 매수.
 * 언제 안 먹히나: 추세가 약하거나 비정상적인 변동이 많을 경우 신호가 빈번하게 발생할 수 있어 트레이딩 비용이 증가함.
 */

function onUpdate(ctx) {
  // indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_prev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsi_prev = ctx.rsi(14, 1);

  // Check if indicators are ready
  if (macd == null || macd_prev == null || rsi == null || rsi_prev == null) {
    return null;
  }

  // MACD crossover signals for buy/sell
  const macd_buy_signal = macd.macd > macd.signal && macd_prev.macd <= macd_prev.signal;  // MACD 교차: rising
  const macd_sell_signal = macd.macd < macd.signal && macd_prev.macd >= macd_prev.signal; // MACD 교차: falling

  // RSI conditions for overbought/oversold
  const rsi_overbought = rsi > 70;
  const rsi_oversold = rsi < 30;

  // Buy condition: RSI is oversold + MACD bullish crossover
  if (rsi_oversold && macd_buy_signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: RSI is overbought + MACD bearish crossover
  if (rsi_overbought && macd_sell_signal) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
