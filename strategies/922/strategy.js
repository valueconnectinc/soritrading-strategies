/*
 * @coinsori-strategy v1
 * name: Mean Reversion with Volume Filter and MACD
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: 이 전략은 평균 회귀 원리를 이용해 가격이 과도하게 상승하거나 하락한 후에 원래 수준으로 돌아오는 패턴을 탐지하려 합니다. MACD와 거래량 필터를 함께 사용하여 매수/매도 신호를 생성합니다.
 * When it buys and sells: 가격이 moving average 이하로 하락하고 MACD가 양수에서 음수로 전환될 때 매수 신호를 생성하고, 가격이 moving average 이상으로 상승하면서 MACD가 음수에서 양수로 전환될 때 매도 신호를 생성합니다. 또한 거래량이 평균 거래량보다 높을 때만 신호를 실행합니다.
 * When it does NOT work: 시장이 강한 추세에 빠져 있을 경우, 또는 거래량과 MACD 간의 상관관계가 약할 경우 전략이 제대로 작동하지 않을 수 있습니다. 특히 트렌드가 장기적으로 지속되는 상황에서는 평균 회귀 전략이 성능을 발휘하지 못합니다.
 */

function onUpdate(ctx) {
  // Moving average
  const ma = ctx.sma(20);
  // MACD values
  const macd = ctx.macd(12, 26, 9);
  // Current volume and average volume
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);

  // Guard against nulls
  if (ma == null || macd == null || vol == null || avgVol == null) {
    return null;
  }

  // Check for crossover conditions
  const prevMacd = ctx.macd(12, 26, 9, 1);
  const prevMa = ctx.sma(20, 1);

  if (prevMacd == null || prevMacd.macd == null || macd.macd == null) {
    return null;
  }

  // Buy condition: price below MA and MACD crosses from positive to negative
  if (ctx.price < ma && prevMacd.macd > prevMacd.signal && macd.macd <= macd.signal && vol > avgVol * 1.2) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: price above MA and MACD crosses from negative to positive
  if (ctx.price > ma && prevMacd.macd < prevMacd.signal && macd.macd >= macd.signal && vol > avgVol * 1.2) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
