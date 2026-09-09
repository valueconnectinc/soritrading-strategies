/*
 * @coinsori-strategy v1
 * name: 볼린저밴드 및 RSI 기반 평균회복 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저밴드와 RSI를 활용하여 과도한 매수/매도 신호를 줄이고, 평균 회복 전략을 통해 시장의 변동성을 활용합니다. 시가가 하단 볼린저 밴드 아래로 떨어질 경우 매수, 상단 볼린저 밴드 위로 올라갈 경우 매도하여 평균 회복 전략을 적용합니다.
 * 언제 사고 언제 파는가: 시가가 하단 볼린저밴드 아래로 떨어질 경우 매수 신호를 받고, 상단 볼린저밴드 위로 올라갈 경우 매도 신호를 받습니다. RSI 지표는 과매수/과매도 상태에서 추가적인 조건을 걸어 트레이딩을 보완합니다.
 * 언제 안 먹히나: 강세 또는 약세의 지속적인 흐름이 있는 시장에서는 볼린저밴드와 RSI가 반복적으로 과매수/과매도 상태로 인해 잘못된 진입 점을 유도할 수 있습니다.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2); // 볼린저밴드 (기간: 20, 계수: 2)
  const rsi = ctx.rsi(14); // RSI (기간: 14)
  
  // 볼린저 밴드와 RSI가 완전히 계산될 때까지 대기
  if (bb == null || rsi == null) return null;
  
  const upper = bb.upper;
  const lower = bb.lower;
  
  // 시가가 하단 볼린저밴드 아래에 위치하고, RSI가 과매도 상태일 경우 매수
  if (ctx.price < lower && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // 시가가 상단 볼린저밴드 위에 위치하고, RSI가 과매수 상태일 경우 매도
  if (ctx.price > upper && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
