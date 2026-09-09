/*
 * @coinsori-strategy v1
 * name: 이동평균교차전략_단순
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 단순한 이동평균선 교차로 트렌드를 파악하여 매매 시점을 정하는 전략으로, 장기적인 추세에 따라 수익을 얻으려는 목표를 가지고 있습니다.
 * 언제 사고 언제 파는가: 짧은 기간의 이동평균선(예: 10일)이 긴 기간의 이동평균선(예: 30일)을 상향 돌파했을 때 매수하고, 반대로 하향 돌파 시 매도합니다.
 * 언제 안 먹히나: 가격이 정상적으로 움직이지 않거나, 진입/청산 시점이 잘못되었을 경우 손실이 커질 수 있습니다. 특히 고금리나 급격한 상승/하락에서 효과적이지 않습니다.
 */

function onUpdate(ctx) {
  // 이동평균선 계산
  const shortSma = ctx.sma(10);   // 짧은 기간 이동평균선 (10시간)
  const longSma = ctx.sma(30);    // 긴 기간 이동평균선 (30시간)

  // 이동평균선이 아직 계산되지 않은 경우
  if (shortSma == null || longSma == null) {
    return null;
  }

  // 매수/매도 조건: 현재 기준으로 단순한 교차 체크만 수행
  if (shortSma > longSma) {
    return { side: 'buy', qty: 0.1 };  // 수량은 0.1로 고정
  } else if (shortSma < longSma) {
    return { side: 'sell', qty: 0.1 };  // 수량은 0.1로 고정
  }

  return null;
}
