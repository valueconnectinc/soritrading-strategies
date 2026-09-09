/*
 * @coinsori-strategy v1
 * name: RSI 기반 과매도/과판매 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI는 과매도/과판매 상태를 감지하기에 효과적인 지표입니다. 가격이 일정 수준 이하로 하락하면 매수, 높아지면 매도하는 방식으로 시장의 반전을 잡으려고 합니다.
 * 언제 사고 언제 파는가: RSI가 30 이하일 때 매수 신호를 받고, RSI가 70 이상일 때 매도 신호를 받습니다.
 * 언제 안 먹히나: 강한 단조 추세나 급격한 변동성으로 인해 RSI가 정상적으로 작동하지 못하는 경우입니다. 특히 빠르게 이동하는 시장에서는 오진이 발생할 수 있습니다.
 */
function onUpdate(ctx) {
  // RSI 지표 계산 (기본값 14일)
  const rsi = ctx.rsi(14);
  
  // 이전 종가와 현재 종가의 차이를 기반으로한 가격 변화율
  const priceChange = ctx.change(1); // 1시간 전과 현재의 가격 변화율

  // RSI가 null이면 데이터가 부족하므로 대기
  if (rsi == null) return null;

  // RSI가 30 이하일 때 매수 신호 (과매도 상태)
  if (rsi < 30 && priceChange > 0) {
    // 가격이 상승하고 있는 상황에서 과매도 상태이므로 매수
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // RSI가 70 이상일 때 매도 신호 (과판매 상태)
  if (rsi > 70) {
    // 과판매 상태이므로 매도
    return { side: 'sell', qty: ctx.position };
  }

  // 그 외에는 아무것도 하지 않음
  return null;
}
