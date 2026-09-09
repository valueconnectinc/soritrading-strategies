/*
 * @coinsori-strategy v1
 * name: 볼린저밴드 기반 평균회복 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저밴드의 상하한선과 RSI 지표를 이용해 시장이 과매수/과매도 상태에서 평균 회복에 진입하는 전략입니다. 시가가 하단 볼린저밴드 아래에 위치하고 RSI가 30 이하인 경우 매수, 상단 볼린저밴드 위에 위치하고 RSI가 70 이상인 경우 매도하여 평균 회복 효과를 노립니다.
 * 언제 사고 언제 파는가: 시가가 하단 볼린저밴드 아래에서 RSI가 30 이하이면 매수, 시가가 상단 볼린저밴드 위에서 RSI가 70 이상이면 매도합니다. 매수/매도 후에는 평균 회복을 통한 수익 확인을 목표로 합니다.
 * 언제 안 먹히나: 거래량이 낮고 시장이 방향성이 강한 경우, 또는 급격한 뉴스로 인해 볼린저밴드가 이상하게 작동할 경우 효과가 없을 수 있습니다.
 */

function onUpdate(ctx) {
  // 입력 데이터 가져오기
  const bb = ctx.bb(20, 2); // 볼린저 밴드 (20일 기준, 2개 표준편차)
  const rsi = ctx.rsi(14); // RSI 지표 (14일 기준)
  
  // 이전 데이터 가져오기
  const bbPrev = ctx.bb(20, 2, 1);
  const rsiPrev = ctx.rsi(14, 1);
  
  // 볼린저밴드가 정상적으로 계산되지 않으면 무시
  if (bb == null || bb.upper == null || bb.middle == null || bb.lower == null || 
      rsi == null || rsiPrev == null) {
    return null;
  }
  
  // 현재 가격 가져오기
  const price = ctx.price;
  
  // 볼린저밴드 상하한선과 RSI를 기준으로 매수/매도 결정
  if (price < bb.lower && rsi <= 30) { 
    // 시가가 하단 볼린저밴드 아래이고, RSI가 30 이하이면 매수
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  } else if (price > bb.upper && rsi >= 70) {
    // 시가가 상단 볼린저밴드 위이고, RSI가 70 이상이면 매도
    return { side: 'sell', qty: ctx.position };
  }
  
  // 이외의 경우 아무것도 하지 않음
  return null;
}
