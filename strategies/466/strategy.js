/*
 * @coinsori-strategy v1
 * name: RSI와 볼린저 밴드 하이브리드 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI는 과매수/과매도 상황을 감지하고, 볼린저 밴드는 가격의 변동성 및 지지/항상 위치를 나타냅니다. 두 지표를 결합하여 강력한 진입 신호를 생성하려고 합니다.
 * 언제 사고 언제 파는가: RSI가 과매도(30 이하) 상태에서 볼린저 밴드 하단을 돌파하면 매수합니다. RSI가 과매수(70 이상) 상태에서 볼린저 밴드 상단을 돌파하면 매도합니다.
 * 언제 안 먹히나: 강한 단조 추세나 급변하는 시장 상황에서는 전략이 일정 수준의 성과를 내지 못할 수 있습니다. 특히 빠르게 움직이는 변동성 시장에서는 진입이 늦거나, 매도 신호가 잘못될 수 있습니다.
 */

function onUpdate(ctx) {
  // 지표 계산
  const rsi = ctx.rsi(14); // RSI 지표
  const bb = ctx.bb(20, 2); // 볼린저 밴드 (기준편차 2)
  
  // 과거 데이터 확인
  const rsi1 = ctx.rsi(14, 1);
  const bb1 = ctx.bb(20, 2, 1);
  
  // RSI와 볼린저 밴드가 null인 경우 대기
  if (rsi == null || bb == null || rsi1 == null || bb1 == null) return null;
  
  // RSI가 과매도 상태인지 확인
  const isOversold = rsi < 30;
  const wasOversold = rsi1 < 30;
  
  // RSI가 과매수 상태인지 확인
  const isOverbought = rsi > 70;
  const wasOverbought = rsi1 > 70;
  
  // 볼린저 밴드 하단과 상단 확인
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const lowerBand1 = bb1.lower;
  const upperBand1 = bb1.upper;
  
  // 현재 가격과 볼린저 밴드 비교
  const price = ctx.price;
  const isPriceAboveUpper = price > upperBand;
  const isPriceBelowLower = price < lowerBand;
  const wasPriceAboveUpper = price > upperBand1;
  const wasPriceBelowLower = price < lowerBand1;
  
  // 매수 조건: RSI가 과매도 상태에서 볼린저 하단 돌파
  if (isOversold && !wasOversold && isPriceBelowLower && !wasPriceBelowLower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // 매도 조건: RSI가 과매수 상태에서 볼린저 상단 돌파
  if (isOverbought && !wasOverbought && isPriceAboveUpper && !wasPriceAboveUpper) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
