/*
 * @coinsori-strategy v1
 * name: Fear and Greed Index Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The fear and greed index reflects market sentiment, and mean reversion suggests that extreme values will return to the average.
 * When it buys and sells: It buys when the index is below a certain threshold (indicating fear), and sells when it's above another threshold (indicating greed).
 * When it does NOT work: During strong trends where the index stays at extreme levels for long periods, the strategy may not perform well.
 */

function onUpdate(ctx) {
  // 데이터셋 가져오기 - 해당 키가 존재하는지 확인
  const fearGreedData = ctx.data('fear_greed');
  
  // 감정 지수는 0에서 100 사이의 값입니다. 평균은 약 50입니다.
  // 너무 낮거나 높은 수치는 시장이 극단적인 상황에 있다는 신호로 해석됩니다.
  
  if (fearGreedData == null) {
    ctx.log("Fear and Greed data not available yet.");
    return null; // 데이터가 없으면 주문을 하지 않음
  }

  // 지표 계산 - 단순한 평균 사용
  const avg = 50; // 기본 평균값 (실제로는 동적으로 계산하거나 고정 값 사용)
  const thresholdLow = 30;  // 'Fear' 상태로 간주하는 하한선
  const thresholdHigh = 70; // 'Greed' 상태로 간주하는 상한선

  // 현재 데이터를 확인
  const current = fearGreedData;
  
  if (current < thresholdLow) {
    // 공포 상태에 진입했을 때 매수
    ctx.log("Fear level low, buying.");
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (current > thresholdHigh) {
    // 탐욕 상태에 진입했을 때 매도
    ctx.log("Greed level high, selling.");
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
