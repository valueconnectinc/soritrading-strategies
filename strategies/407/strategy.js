/*
 * @coinsori-strategy v1
 * name: 거래량 기반 추세 추적 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 거래량은 시장의 흐름을 반영합니다. 특정 자산의 거래량이 증가하는 경우, 추세가 강해질 가능성이 높습니다. 따라서 거래량 변화를 기반으로 시장 흐름을 판단하려 합니다.
 * 언제 사고 언제 파는가: 현재 거래량이 평균 거래량보다 1.5배 이상 증가하고, 가격이 상승하는 경우 매수하며, 반대의 경우 매도합니다.
 * 언제 안 먹히나: 거래량이 높아지면서도 가격이 하락하거나, 장기적으로 거래량이 낮은 시장에서는 유효하지 않을 수 있습니다.
 */
function onUpdate(ctx) {
  // 현재 거래량과 평균 거래량 계산
  const currentVol = ctx.vol;
  const avgVol = ctx.avgVol(10); // 최근 10시간의 평균 거래량

  // 가격 변화율 계산
  const priceChange = ctx.change(1);

  // 데이터가 충분하지 않으면 대기
  if (currentVol == null || avgVol == null) return null;

  // 현재 거래량이 평균 거래량의 1.5배 이상이며, 가격이 상승하는 경우 매수
  if (currentVol > avgVol * 1.5 && priceChange > 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 현재 거래량이 평균 거래량의 1.5배 이상이며, 가격이 하락하는 경우 매도
  if (currentVol > avgVol * 1.5 && priceChange < 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // 그 외에는 아무것도 하지 않음
  return null;
}
