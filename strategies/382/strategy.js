/*
 * @coinsori-strategy v1
 * name: RSI와 SMA 기반 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 SMA 지표를 이용하여 단기 변동성과 장기 추세를 동시에 고려한 전략.
 * 언제 사고 언제 파는가: RSI가 30 이하이면 매수, 70 이상이면 매도. 단, SMA5가 SMA20 위에 있어야 매수.
 * 언제 안 먹히나: 시장이 장기간 평탄하게 움직이는 경우, RSI 지표의 한계로 인해 진입 시점이 뒤처질 수 있음.
 */

function onUpdate(ctx) {
  // 필요한 지표들 계산
  const rsi = ctx.rsi(14);
  const sma5 = ctx.sma(5);
  const sma20 = ctx.sma(20);
  
  // 지표가 준비되지 않았을 경우 무시
  if (rsi == null || sma5 == null || sma20 == null) return null;
  
  // 진입 조건: RSI < 30 이고, SMA5 > SMA20이면 매수
  if (rsi < 30 && sma5 > sma20 && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // 청산 조건: RSI > 70 이면 매도
  if (rsi > 70 && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
