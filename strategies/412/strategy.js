/*
 * @coinsori-strategy v1
 * name: SMA20/60 Cross with Volume Filter and Min-Hold (Revised)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: SMA20과 SMA60의 골든크로스를 기반으로 트렌드를 감지하고, 거래량이 평균보다 높을 때에만 진입하여 무작위 진입을 줄이고자 합니다. 추가적으로 최소 보유 기간을 설정하여 과도한 매매를 방지합니다.
 * 언제 사고 언제 파는가: SMA20이 SMA60을 교차할 때 매수, SMA20이 SMA60을 아래로 교차할 때 매도합니다. 진입 시 거래량이 평균 거래량보다 1.15배 이상일 경우에만 진입하며, 최소 12봉은 보유합니다.
 * 언제 안 먹히나: 거래량이 일정 수준 이상이지 못하거나, 트렌드가 명확하지 않은 시기에는 효과적이지 않으며, 강세인 시장에서 지속적인 교차가 발생할 경우에도 전략성이 떨어질 수 있습니다.
 */

function onUpdate(ctx) {
  const { position, price, cash, i } = ctx;
  
  // SMA 계산
  const sma20 = ctx.sma(20, 0);
  const sma60 = ctx.sma(60, 0);
  const sma20prev = ctx.sma(20, 1);
  const sma60prev = ctx.sma(60, 1);

  // 평균 거래량 계산 (30일 평균)
  const avgVol = ctx.avgVol(30);

  // 현재 거래량
  const currentVol = ctx.vol;

  // 최소 보유 기간 설정 (12봉)
  const minHoldBars = 12;
  
  // SMA 교차 확인
  const crossedUp = sma20prev <= sma60prev && sma20 > sma60;
  const crossedDown = sma20prev >= sma60prev && sma20 < sma60;

  // 거래량 필터: 평균보다 1.15배 이상
  const volumeFilter = currentVol > avgVol * 1.15;

  // 진입 조건
  if (position === 0 && crossedUp && volumeFilter) {
    return { side: 'buy', qty: cash / price * 0.99 };
  }
  
  // 매도 조건: SMA 교차가 발생하고, 현재 보유 중일 때만 매도
  if (position > 0 && crossedDown) {
    return { side: 'sell', qty: position };
  }

  return null;
}
