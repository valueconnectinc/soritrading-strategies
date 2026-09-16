/*
 * @coinsori-strategy v1
 * name: MACD Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: 이 전략은 MACD 지표의 교차를 기반으로 한 평균회귀 전략입니다. MACD가 신호선 아래로 내려가면 매수 포지션을 취하고, 위로 올라가면 매도 포지션을 취합니다.
 * When it buys and sells: MACD 지표에서 신호선과 메인 라인이 교차하는 지점을 기준으로, 신호선이 아래로 내려가는 경우 매수, 위로 올라가는 경우 매도를 합니다.
 * When it does NOT work: MACD가 강한 트렌드를 유지할 때에는 평균회귀 전략이 효과적이지 않으며, 시장이 빠르게 변동하거나 방향성이 명확하지 않은 경우에도 수익률이 낮을 수 있습니다.
 */
function onUpdate(ctx) {
  // MACD 지표 생성 (12, 26, 9)
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_prev = ctx.macd(12, 26, 9, 1);
  
  // MACD가 정의되지 않은 경우 반환
  if (macd == null || macd_prev == null) return null;

  // 신호선과 메인 라인이 교차하는 지점 확인
  const macdLine = macd.macd;
  const signalLine = macd.signal;
  const macdLine_prev = macd_prev.macd;
  const signalLine_prev = macd_prev.signal;

  // 매수 조건: 이전 봉의 신호선이 메인 라인 아래에 있었고, 현재는 위로 교차한 경우
  if (macdLine_prev <= signalLine_prev && macdLine > signalLine) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 조건: 이전 봉의 신호선이 메인 라인 위에 있었고, 현재는 아래로 교차한 경우
  if (macdLine_prev >= signalLine_prev && macdLine < signalLine) {
    return { side: 'sell', qty: ctx.position };
  }

  // 아무것도 하지 않음
  return null;
}
