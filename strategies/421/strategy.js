/*
 * @coinsori-strategy v1
 * name: MACD + 볼린저밴드 다중조건 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: MACD와 볼린저 밴드의 정보를 결합하여 강력한 진입 신호를 만듭니다. 
 * 언제 사고 언제 파는가: MACD가 양수이고, 가격이 하단 볼린저 밴드에 도달했을 경우 매수 신호로 인식합니다. 
 * 언제 안 먹히나: 시장이 강한 단조 트렌드를 보일 경우, 볼링저 밴드가 급격히 이동하여 진입 신호가 빈번하게 발생하지만, 실질적인 수익률이 낮을 수 있습니다.
 */

function onUpdate(ctx) {
  // MACD와 볼린저 밴드 지표를 계산합니다.
  const macd = ctx.macd(12, 26, 9); // MACD 12, 26, 9 기준
  const bb = ctx.bb(20, 2); // 볼린저 밴드 20일, 2배 표준편차

  // 이전 봉의 MACD와 볼린저 밴드 값을 가져옵니다.
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const bbPrev = ctx.bb(20, 2, 1);

  // 지표가 초기값이면 리턴
  if (macd == null || bb == null || macdPrev == null || bbPrev == null) return null;

  // 매수 조건: MACD가 양수이고, 가격이 하단 볼린저 밴드에 도달한 경우
  if (macd.macd > 0 && ctx.price <= bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 조건: MACD가 음수이고, 가격이 상단 볼린저 밴드에 도달한 경우
  if (macd.macd < 0 && ctx.price >= bb.upper) {
    return { side: 'sell', qty: ctx.position };
  }

  // 조건에 해당하지 않으면 아무 것도 하지 않음
  return null;
}
