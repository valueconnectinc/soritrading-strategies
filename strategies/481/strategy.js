/*
 * @coinsori-strategy v1
 * name: 볼린저 밴드 기반 평균 회복 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 가격이 볼린저 밴드 상단에서 하향 운동을 시작할 때, 하단으로 회복될 가능성 있는 상황에서 매수를 시도합니다. 평균 회복 전략은 일정한 추세 없이 변동성이 큰 자산에서 특히 효과적일 수 있습니다.
 * 언제 사고 언제 파는가: 가격이 볼린저 밴드 하단으로 떨어졌다가 다시 상승 추세를 보이기 시작하면 매수합니다. 그리고 가격이 상단으로 다시 올라가면 매도합니다.
 * 언제 안 먹히나: 가상자산의 급등 또는 급락 현상이 지속되는 경우, 혹은 편차가 너무 크거나 작은 경우 성과가 좋지 않을 수 있습니다.
 */

function onUpdate(ctx) {
  // 볼린저 밴드 계산 (20일 기준, 2 표준편차)
  const bb = ctx.bb(20, 2, 0);
  if (bb == null) return null;
  
  // 이전 종가와 현재 종가
  const currentClose = ctx.candle.close;
  const prevClose = ctx.closes[1];
  
  // 볼린저 밴드 하단과 현재 가격 비교
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const middleBand = bb.middle;
  
  // 현재가가 하단 밴드를 뚫고 올라가는 경우 (매수 신호)
  if (prevClose <= lowerBand && currentClose > lowerBand) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // 현재가가 상단 밴드를 뚫고 하강하는 경우 (매도 신호)
  if (prevClose >= upperBand && currentClose < upperBand) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
