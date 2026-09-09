/*
 * @coinsori-strategy v1
 * name: RSI+볼린저밴드 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI 지표와 볼린저 밴드를 함께 사용하여 과매도/과매수 상태에서의 추세 변화를 보다 정확하게 감지합니다.
 * 언제 사고 언제 파는가: RSI가 30 미만이고, 볼린저밴드 하단을 돌파하면 매수 신호, RSI가 70 초과이고 볼린저밴드 상단을 돌파하면 매도 신호를 생성합니다.
 * 언제 안 먹히나: 시장이 끊임없이 추세를 이어가고 볼린저 밴드가 변동성이 낮은 경우, 잘못된 신호를 생성할 수 있습니다.
 */
function onUpdate(ctx) {
  // RSI 지표 및 볼린저밴드 계산
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2); // 기준일 20, 계수 2
  
  // 필요한 데이터가 충분하지 않으면 대기
  if (rsi == null || bb == null) return null;
  
  // 현재 포지션 크기
  const position = ctx.position;
  
  // 볼린저밴드 하단을 돌파하고 RSI가 과매도 상태이면 매수
  if (rsi < 30 && ctx.price < bb.lower && position === 0) {
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99
    };
  }
  
  // 볼린저밴드 상단을 돌파하고 RSI가 과매수 상태이면 매도
  if (rsi > 70 && ctx.price > bb.upper && position > 0) {
    return {
      side: 'sell',
      qty: position
    };
  }
  
  // 다른 상태에서는 아무 것도 하지 않음
  return null;
}
