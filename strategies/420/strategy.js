/*
 * @coinsori-strategy v1
 * name: 평균 회귀 + 볼린저 밴드 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 평균 회귀 및 볼린저 밴드 기법을 결합하여, 상황에 따라 진입/이탈 조건을 설정합니다.
 * 언제 사고 언제 파는가: 가격이 볼린저 밴드 하위로 내려가면 매수, 반대일 경우 매도합니다.
 * 언제 안 먹히나: 시장이 단조롭게 움직이는 경우, 볼린저 밴드가 신뢰성을 잃는 경우 전략이 무효화됩니다.
 */

function onUpdate(ctx) {
  // 볼린저 밴드를 계산합니다.
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  // 현재 가격
  const price = ctx.price;
  
  // 현재 포지션
  const position = ctx.position;

  // 볼린저 밴드 하단(하위)에 가격이 도달하면 매수
  if (price <= bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (price >= bb.upper && position > 0) {
    // 볼린저 밴드 상단(상위)에 도달하면 매도
    return { side: 'sell', qty: position };
  }

  return null;
}
