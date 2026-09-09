/*
 * @coinsori-strategy v1
 * name: RSI + 볼륨 기반 하이브리드 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 볼륨을 결합하여 과매도/과매수 상태에서의 신호를 더욱 강화하고, 볼륨이 증가할 때 진입함으로써 신뢰성을 높입니다. RSI는 지나친 매수/매도를 방지하고, 볼륨은 시장의 참여도를 확인해줍니다.
 * 언제 사고 언제 파는가: RSI가 30 이하에서 상승하는 경우 매수 신호로 간주하고, 70 이상에서 하락할 경우 매도 신호로 간주합니다. 볼륨은 평균 볼륨의 1.2배 이상일 경우에만 진입합니다.
 * 언제 안 먹히나: 시장의 방향성과 볼륨이 일치하지 않을 경우, 또는 일정 기간 동안 RSI가 정상 범위를 벗어나지 않는 경우에도 전략 성과가 좋지 않을 수 있습니다. 시장 진입 시점이 예측 불가능할 때도 위험성이 큽니다.
 */
function onUpdate(ctx) {
  // RSI와 볼륨 계산
  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  
  if (rsi == null || rsiPrev == null) return null;
  
  // 볼륨 필터
  const avgVol = ctx.avgVol(20);  
  if (avgVol == null || ctx.vol == null) return null; 
  
  // 볼륨이 평균의 1.2배 이상일 경우에만 신호 적용
  if (ctx.vol < avgVol * 1.2) return null;
  
  // RSI 과매도에서 상승할 경우 매수
  if (rsiPrev <= 30 && rsi > rsiPrev) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // RSI 과매수에서 하락할 경우 매도
  if (rsiPrev >= 70 && rsi < rsiPrev && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
