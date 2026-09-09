/*
 * @coinsori-strategy v1
 * name: MACD 크로스오버 전략 - 최종 개선版
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: MACD 지표의 신호를 바탕으로 장기 추세를 판단하고, 매수/매도 시점을 결정합니다. MACD가 신뢰할 수 있는 트렌드를 보여주는 경우에만 진입하여 수익을 얻으려고 합니다.
 * 언제 사고 언제 파는가: MACD의 라인 크로스오버(곡선이 라인을 위로 교차할 때 매수, 아래로 교차할 때 매도)를 기준으로 매수/매도 신호를 보내며, 진입 후 수익률이 일정 수준 이상일 경우 종료합니다.
 * 언제 안 먹히나: 고정된 MACD 파라미터가 시장 조건에 맞지 않을 경우, 급격한 가격 변화나 레버리지가 적용되어 있는 시장에서는 효율성이 떨어질 수 있습니다. 빈도가 낮은 시장에서는 신호가 너무 자주 발생하지 않아 효과적이지 않을 수도 있습니다.
 */

function onUpdate(ctx) {
  // MACD 지표 계산 (12, 26, 9)
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  // 현재 가격
  const price = ctx.price;
  
  // 포지션 및 자산 상태 확인
  const position = ctx.position;
  const cash = ctx.cash;
  
  // MACD 값이 null이면 대기
  if (macd == null || macdPrev == null) return null;
  
  // MACD가 이전과 비교하여 크로스오버된 경우 신호 확인
  const isCrossUp = (macdPrev.macd <= macdPrev.signal) && (macd.macd > macd.signal);
  const isCrossDown = (macdPrev.macd >= macdPrev.signal) && (macd.macd < macd.signal);
  
  // 매수 조건: MACD 곡선이 신호선을 위로 교차
  if (isCrossUp && position === 0) {
    return { side: 'buy', qty: cash / price * 0.99 };
  }
  
  // 매도 조건: MACD 곡선이 신호선을 아래로 교차
  if (isCrossDown && position > 0) {
    return { side: 'sell', qty: position };
  }
  
  return null;
}
