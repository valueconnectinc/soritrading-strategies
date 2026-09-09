/*
 * @coinsori-strategy v1
 * name: 볼린저밴드와 MACD 기반 단순 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저밴드의 상단/하단과 MACD의 신호 변화를 결합한 단순한 트레이딩 전략입니다. 시장의 변동성을 활용해 진입 점을 찾습니다.
 * 언제 사고 언제 파는가: 볼린저밴드 상단에서 MACD 신호가 과매도 영역을 벗어나는 경우 매수. 하단에서 MACD 신호가 과매수 영역을 벗어나면 매도. 두 지표의 결합으로 신뢰성 있는 진입점을 찾습니다.
 * 언제 안 먹히나: 시장이 정조회 혹은 단조로운 추세를 유지하는 경우, 특히 빠르게 움직이는 상황에서는 전략이 작동하지 않을 수 있습니다.
 */

function onUpdate(ctx) {
  // 지표 계산
  const bb = ctx.bb(20, 2); // 볼린저밴드 (기준편차 2)
  const macd = ctx.macd(12, 26, 9); // MACD (12, 26, 9)

  // 이전 지표 값들
  const bbPrev = ctx.bb(20, 2, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);

  // 조건별로 null 체크
  if (
    bb == null || 
    bb.upper == null || 
    bb.lower == null || 
    macd == null || 
    macd.macd == null || 
    macd.signal == null ||
    bbPrev == null || 
    bbPrev.upper == null || 
    bbPrev.lower == null || 
    macdPrev == null || 
    macdPrev.macd == null || 
    macdPrev.signal == null
  ) {
    return null;
  }

  // 볼린저밴드 상단에서 MACD가 과매도 영역을 벗어나는 경우 매수 (RSI와 거래량 필터 제거)
  if (
    ctx.price > bb.upper && 
    macdPrev.macd <= macdPrev.signal && 
    macd.macd > macd.signal
  ) {
    ctx.log("매수 신호: 볼린저 상단 + MACD 과매도 회복");
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 볼린저밴드 하단에서 MACD가 과매수 영역을 벗어나는 경우 매도
  if (
    ctx.price < bb.lower && 
    macdPrev.macd >= macdPrev.signal && 
    macd.macd < macd.signal
  ) {
    ctx.log("매도 신호: 볼린저 하단 + MACD 과매수 하락");
    return { side: 'sell', qty: ctx.position }; // 포지션 전부 청산
  }

  return null; // 다른 조건 미충족 시 주문 없음
}
