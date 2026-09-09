/*
 * @coinsori-strategy v1
 * name: RSI와 MACD를 이용한 하이브리드 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 MACD 지표의 교차를 활용하여 과매수/과매도 신호와 추세 방향을 동시에 고려함으로써, 더 강력한 진입 신호를 생성합니다.
 * 언제 사고 언제 파는가: RSI가 30 미만일 때 MACD가 양수에서 음수로 전환되는 경우 매수신호, RSI가 70 초과일 때 MACD가 음수에서 양수로 전환되는 경우 매도신호를 생성합니다.
 * 언제 안 먹히나: 강한 추세가 지속되는 상황에서는 RSI와 MACD 모두가 진입 신호를 주지 않아서 수익률이 낮게 나타날 수 있습니다. 또한, 시장이 빠르게 변할 경우 교차 신호가 느리게 반영되어 손실이 발생할 수 있습니다.
 */
function onUpdate(ctx) {
  // RSI 및 MACD 지표 초기화
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  
  // 이전 값들 (1번 전의 데이터)
  const prevRsi = ctx.rsi(14, 1);
  const prevMacd = ctx.macd(12, 26, 9, 1);

  // 매수 조건: RSI가 과매도 구간(30) 아래로 내려가고, MACD가 양수에서 음수로 변경되는 경우
  if (rsi != null && prevRsi != null && macd != null && prevMacd != null) {
    // 과매수/과매도 조건을 확인하고 현재 MACD와 이전 MACD의 교차 확인
    if (prevRsi <= 30 && rsi > 30 && prevMacd.macd > prevMacd.signal && macd.macd <= macd.signal) {
      // 매수 진입
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // 매도 조건: RSI가 과매수 구간(70) 이상으로 올라가고, MACD가 음수에서 양수로 변경되는 경우
    if (prevRsi >= 70 && rsi < 70 && prevMacd.macd < prevMacd.signal && macd.macd >= macd.signal) {
      // 매도 진입
      return { side: 'sell', qty: ctx.position };
    }
  }

  // 다른 조건이 충족되지 않으면 아무 것도 하지 않음
  return null;
}
