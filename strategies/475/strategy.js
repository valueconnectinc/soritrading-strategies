/*
 * @coinsori-strategy v1
 * name: 볼린저밴드_Macd_하이브리드_전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저밴드의 터치와 MACD의 교차를 함께 사용하여, 시장의 추세와 변동성 변화에 강하게 반응하는 진입 신호를 생성합니다.
 * 언제 사고 언제 파는가: 볼린저밴드 하단(하위)에서 가격이 올라오고, MACD가 양수 영역에서 음수로 전환될 때 매수. 그 반대 상황에서는 매도.
 * 언제 안 먹히나: 강력한 단방향 추세 상황이나, 시장 변동성이 낮은 평탄한 시장에서는 수익률이 낮습니다.
 */

function onUpdate(ctx) {
  // 볼린저밴드 지표 설정
  const bb = ctx.bb(20, 2); // 기간: 20, 표준편차: 2
  if (bb == null) return null;

  // MACD 지표 설정
  const macd = ctx.macd(12, 26, 9);
  if (macd == null || macd.macd == null || macd.signal == null) return null;

  // 현재 가격과 볼린저밴드 값 비교
  const price = ctx.price;
  const lowerBand = bb.lower; // 볼린저 하단
  const upperBand = bb.upper; // 볼린저 상단
  const middleBand = bb.middle; // 볼린저 중간선

  // 이전 MACD 값
  const prevMacd = ctx.macd(12, 26, 9, 1);
  const prevSignal = ctx.macd(12, 26, 9, 1)?.signal;
  if (prevMacd == null || prevSignal == null) return null;

  // 볼린저 밴드 하단에서 가격이 올라온 경우 (매수 신호)
  const isBounce = price > lowerBand && ctx.price > ctx.price - 1; // 현재가가 지난 번보다 높은지 확인

  // MACD의 교차 (매수 신호: MACD가 시그널을 넘는 경우)
  const isMacdCrossUp = prevMacd.macd <= prevSignal && macd.macd > macd.signal;

  // 매수 조건
  if (isBounce && isMacdCrossUp) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 신호: 볼린저 밴드 상단에서 가격이 내려가고, MACD가 음수에서 양수로 전환되는 경우
  const isSellSignal = price < upperBand && ctx.price < ctx.price + 1; // 현재가가 지난 번보다 낮은지 확인
  const isMacdCrossDown = prevMacd.macd >= prevSignal && macd.macd < macd.signal;

  // 매도 조건
  if (isSellSignal && isMacdCrossDown) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
