/*
 * @coinsori-strategy v1
 * name: 하이브리드 MACD-RSI 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: MACD와 RSI 모두 강력한 추세 및 과매도/과판매 신호를 제공하지만, 단독으로 사용할 경우 오진이 발생할 수 있습니다. 두 지표를 결합하여 신뢰성 있는 진입 신호를 생성합니다.
 * 언제 사고 언제 파는가: MACD의 히스토그램이 양수에서 음수로 전환되고 RSI가 30 미만일 때 매수, 반대 상황일 때 매도합니다.
 * 언제 안 먹히나: 강한 단방향 시장에서 MACD와 RSI 모두 한쪽 방향으로만 움직이기 시작하면 진입 신호가 빈번하게 발생하지 않거나 오진이 발생할 수 있습니다.
 */
function onUpdate(ctx) {
  // 지표 계산
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);

  // 유효성 검사
  if (macd == null || macdPrev == null || rsi == null || rsiPrev == null) {
    return null;
  }

  // 매수 조건: MACD 히스토그램이 전전에서 전으로 바뀌고, RSI가 과매도 상태일 때
  if (macdPrev.histogram <= 0 && macd.histogram > 0 && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 조건: MACD 히스토그램이 전전에서 전으로 바뀌고, RSI가 과판매 상태일 때
  if (macdPrev.histogram >= 0 && macd.histogram < 0 && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }

  // 포지션 유지
  return null;
}
