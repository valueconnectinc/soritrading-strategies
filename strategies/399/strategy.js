/*
 * @coinsori-strategy v1
 * name: Stochastic과 MACD 하이브리드 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 가격 움직임과 거래량의 흐름을 동시에 고려하기 위해 Stochastic Oscillator와 MACD를 결합합니다. 단순한 지표보다는 다층적 신호를 통해 진입 시점을 더 정확하게 파악하려 합니다.
 * 언제 사고 언제 파는가: Stochastic이 20 이하에서 상향 돌파하고, MACD가 긍정값으로 전환될 때 매수 신호 발생. 이후 가격이 이동평균선을 상회하면 매도.
 * 언제 안 먹히나: 강한 방향성 없이 횡보하는 시장에서는 효과가 없습니다. 또한 Stochastic과 MACD가 동시에 신호를 주지 않을 경우 진입하지 않게 됩니다.
 */
function onUpdate(ctx) {
  const stoch = ctx.stoch(14, 3); // Stochastic Oscillator
  const macd = ctx.macd(12, 26, 9); // MACD
  const sma = ctx.sma(50); // 50시간 이동평균선
  const price = ctx.price;

  // 지표들이 null이면 대기
  if (stoch == null || macd == null || sma == null) return null;

  // Stochastic이 20 이하에서 상향 돌파하고, MACD가 긍정값일 경우 매수 신호
  if (stoch.k > stoch.d && stoch.k < 20 && macd.macd > macd.signal) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  
  // 가격이 이동평균선을 상회하면 매도
  if (price > sma) {
    const qty = ctx.position;
    if (qty > 0) {
      return { side: 'sell', qty: qty };
    }
  }

  return null; // 아무것도 하지 않음
}
