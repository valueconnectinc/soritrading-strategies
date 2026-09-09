/*
 * @coinsori-strategy v1
 * name: RSI 볼륨 하이브리드 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI를 통해 과매수/과매도 상태를 감지하고, 볼륨을 이용해 진입 신호의 강도를 파악함으로써,
 * 더 안정적인 진입 시점 찾기를 목표로 합니다.
 * 언제 사고 언제 파는가: RSI가 과매도 상태에서 다시 상승할 때 볼륨이 평균보다 높은 경우에 매수하며,
 * RSI가 과매초 상태에서 하락할 때 볼륨이 평균보다 높은 경우에 매도합니다.
 * 언제 안 먹히나: 강한 단기 트렌드가 지속되는 중에는 RSI가 조기 반전 신호로 작동하지 않으므로,
 * 오히려 손실을 발생시킬 수 있습니다. 또한, 볼륨이 평균보다 높은 상태가 지속되지 않을 경우에도
 * 신호가 약해질 수 있습니다.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14);      // RSI 지표 (14일 기준)
  const vol = ctx.vol;          // 현재 볼륨
  const avgVol = ctx.avgVol(20); // 평균 볼륨 (20일 기준)

  // RSI가 과매도 상태인지 확인 (RSI < 30)
  const isOversold = rsi != null && rsi < 30;
  // RSI가 과매초 상태인지 확인 (RSI > 70)
  const isOverbought = rsi != null && rsi > 70;

  // 볼륨이 평균 볼륨보다 높은지 확인
  const isVolumeHigh = vol != null && avgVol != null && vol > avgVol;

  // 매수 조건: RSI가 과매도 상태이고, 볼륨이 평균보다 높은 경우
  if (isOversold && isVolumeHigh) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 조건: RSI가 과매초 상태이고, 볼륨이 평균보다 높은 경우
  if (isOverbought && isVolumeHigh) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
