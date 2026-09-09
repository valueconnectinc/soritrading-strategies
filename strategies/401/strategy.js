/*
 * @coinsori-strategy v1
 * name: 거래량 기반 진입 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 단순한 이동평균선보다는 거래량 정보를 활용하여 트렌드의 강도를 판단합니다. 거래량이 급증하는 시점에서 가격이 상승하거나 하락하는 경우, 트렌드 전환이 일어날 가능성이 높습니다. 따라서 고거래량 시점에 진입하고, 추가적인 신호를 기다리면서 포지션을 청산합니다.
 * 언제 사고 언제 파는가: 현재 거래량이 평균 거래량보다 1.5배 이상 증가한 시점에서 가격이 상승하면 매수, 하락하면 매도 신호가 발생합니다. 이후 추세가 지속되면 추가적인 신호를 기다리며 포지션을 유지하고, 추세가 약해지면 청산합니다.
 * 언제 안 먹히나: 거래량이 일정 수준 이상 증가하지 않는 시장, 또는 거래량이 급증하더라도 가격이 반대 방향으로 움직이는 경우 등, 트렌드 전환이 명확하지 않아 실패할 수 있습니다. 특히 횡보하는 시장에서는 이러한 전략의 성과가 좋지 않을 수 있습니다.
 */
function onUpdate(ctx) {
  // 거래량 데이터 사용
  const volume = ctx.vol;
  const avgVolume = ctx.avgVol(20);  // 최근 20시간 평균 거래량

  // 가격 데이터 사용
  const currentPrice = ctx.price;
  const prevClose = ctx.closes[1];    // 전일 종가
  const prevPrevClose = ctx.closes[2]; // 전전일 종가

  if (volume == null || avgVolume == null || prevClose == null || prevPrevClose == null) {
    return null;
  }

  // 거래량이 평균보다 1.5배 이상 증가했을 경우
  if (volume > avgVolume * 1.5) {
    // 가격 상승 시 매수 신호
    if (currentPrice > prevClose && prevClose > prevPrevClose) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    // 가격 하락 시 매도 신호
    else if (currentPrice < prevClose && prevClose < prevPrevClose) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // 그 외에는 아무것도 하지 않음
  return null;
}
