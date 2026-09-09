/*
 * @coinsori-strategy v1
 * name: 볼린저 밴드와 RSI를 기반으로 한 단순 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저 밴드와 RSI는 각각 가격의 변동성과 과매수/과매도 상태를 잘 나타냅니다. 두 지표를 동시에 활용하여 매수/매도 신호를 생성하면, 시장의 반전 포인트를 더 정확하게 잡을 수 있습니다.
 * 언제 사고 언제 파는가: RSI가 30 이하이고 볼린저 밴드 하단을 하락추세로 뚫는 경우 매수 신호로 간주. 반대로 RSI가 70 이상이고 볼린저 밴드 상단을 상승추세로 뚫는 경우 매도 신호로 간주.
 * 언제 안 먹히나: 강한 단기 추세가 지속되는 시장에서는 이 전략의 효과가 제한적일 수 있습니다. 또한, 급격한 변동성 발생 시 오작동이 생길 수 있습니다.
 */
function onUpdate(ctx) {
  // 볼린저 밴드와 RSI 계산
  const bb = ctx.bb(20, 2);
  const rsi = ctx.rsi(14);
  
  if (bb == null || rsi == null) return null;
  
  // 현재 포지션 상태 확인
  const position = ctx.position;
  
  // RS가 30 이하이고 볼린저 하단을 뚫는 경우 매수
  if (rsi < 30 && ctx.price < bb.lower) {
    if (position <= 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  
  // RS가 70 이상이고 볼린저 상단을 뚫는 경우 매도
  if (rsi > 70 && ctx.price > bb.upper) {
    if (position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }
  
  // otherwise, do nothing
  return null;
}
