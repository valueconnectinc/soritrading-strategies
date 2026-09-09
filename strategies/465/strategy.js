/*
 * @coinsori-strategy v1
 * name: MACD 기반 트렌드 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: MACD 지표는 추세의 강약을 잘 보여주며, 크로스오버 시점에서 매수/매도 신호를 생성합니다. 추세가 강할 때 효과적이므로, 변동성이 큰 시장에서 수익을 기대할 수 있습니다.
 * 언제 사고 언제 파는가: MACD 맥화선이 신호선을 상향 돌파하면 매수, 하향 돌파하면 매도합니다. 크로스오버가 일어날 때만 주문을 내립니다.
 * 언제 안 먹히나: 시장이 횡보하거나 추세가 약할 경우, MACD가 정상적으로 작동하지 않아 매매 신호가 적게 발생합니다. 이때는 수익률이 낮거나 손실이 발생할 수 있습니다.
 */

function onUpdate(ctx) {
  // MACD 지표 설정 (12, 26, 9)
  const macd = ctx.macd(12, 26, 9, 1);
  const prevMacd = ctx.macd(12, 26, 9, 2);
  
  // 이동평균선 설정 (20-period SMA)
  const sma = ctx.sma(20, 1);
  const prevSma = ctx.sma(20, 2);
  
  // 현재 가격
  const price = ctx.price;
  
  // 지표가 아직 초기 상태인지 확인
  if (macd == null || prevMacd == null || sma == null || prevSma == null) {
    return null;
  }
  
  // MACD 크로스오버 조건 확인
  const macdCrossUp = prevMacd.macd <= prevMacd.signal && macd.macd > macd.signal;  // 상향 돌파
  const macdCrossDown = prevMacd.macd >= prevMacd.signal && macd.macd < macd.signal; // 하향 돌파
  
  // 이동평균선 방향 확인 (추세 강약 판단)
  const trendUp = sma > prevSma;
  
  // 매수 조건: MACD 상향 돌파 + 추세 상승
  if (macdCrossUp && trendUp) {
    ctx.log("MACD 상향 돌파 및 추세 상승 - 매수 신호");
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  
  // 매도 조건: MACD 하향 돌파 + 추세 하강
  if (macdCrossDown && !trendUp) {
    ctx.log("MACD 하향 돌파 및 추세 하강 - 매도 신호");
    return { side: 'sell', qty: ctx.position };
  }
  
  // 추가적인 매도 조건: 현재 위치가 매수 상태이고 MACD 하향 돌파
  if (ctx.position > 0 && macdCrossDown) {
    ctx.log("매수 상태에서 MACD 하향 돌파 - 매도");
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
