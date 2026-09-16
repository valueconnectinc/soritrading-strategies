/*
 * @coinsori-strategy v1
 * name: RSI Divergence Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: 이 전략은 RSI 지표를 기반으로 한 다운워드 디버전 전략입니다. 가격이 하락하지만 RSI가 상승하는 경우 매수 포지션을 취하고, 반대의 경우 매도 포지션을 취합니다.
 * When it buys and sells: 가격이 하락하지만 RSI가 상승하는 경우 (부정적 분기) 매수, 그 반대의 경우 매도를 합니다.
 * When it does NOT work: 시장이 강한 상승 또는 하락 트렌드를 유지할 때에는 디버전 신호가 발생하지 않아 전략이 효과적이지 않을 수 있습니다.
 */
function onUpdate(ctx) {
  // RSI 및 가격 데이터 가져오기
  const rsi = ctx.rsi(14, 0);
  const rsi_prev = ctx.rsi(14, 1);
  const price = ctx.price;
  const price_prev = ctx.closes[1];
  
  // RSI 또는 가격이 정의되지 않은 경우 반환
  if (rsi == null || rsi_prev == null || price_prev == null) return null;

  // 가격이 하락했고, RSI가 상승한 경우 (부정적 디버전)
  if (price < price_prev && rsi > rsi_prev ) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 가격이 상승했고, RSI가 하락한 경우 (긍정적 디버전)
  if (price > price_prev && rsi < rsi_prev) {
    return { side: 'sell', qty: ctx.position };
  }

  // 아무것도 하지 않음
  return null;
}
