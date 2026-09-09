/*
 * @coinsori-strategy v1
 * name: 볼륨+MACD 필터링 하이브리드 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: MACD와 볼륨 지표를 결합하여 트렌드의 강도와 신뢰성을 평가하고, 고려된 조건이 모두 충족될 때만 진입하는 방식으로, 과거의 빠진 정보를 보완하며 안정적인 수익률을 노립니다.
 * 언제 사고 언제 파는가: 볼륨이 평균 볼륨보다 높고, MACD가 신호선 위에 있을 때 매수 신호가 발생하며, 반대의 조건일 때 매도합니다.
 * 언제 안 먹히나: 긴장된 시장 상황, 빠르게 변화하는 흐름과 볼륨이 불안정한 경우에 성능이 저하될 수 있습니다.
 */
function onUpdate(ctx) {
  // MACD 지표
  const macd = ctx.macd(12, 26, 9, 0);
  
  // 볼륨 지표  
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20); // 지난 20시간 동안의 평균 볼륨
  
  // 조건들에 대한 유효성 검사
  if (macd == null || macd.macd == null || macd.signal == null || vol == null || avgVol == null) return null;

  // 볼륨이 평균보다 높은 경우에만 진입
  const volumeFilter = vol > avgVol * 1.2; // 볼륨이 평균의 120% 이상일 때
  
  // MACD 조건
  const macdCondition = macd.macd > macd.signal; // MACD가 신호선 위에 있을 때

  // 매수조건 (볼륨 필터 + MACD 조건)
  if (volumeFilter && macdCondition && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도조건
  if (!macdCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
