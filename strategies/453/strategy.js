/*
 * @coinsori-strategy v1
 * name: 단순 이동평균선 교차 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 단순한 이동평균선 교차 전략은 추세의 방향성을 파악하는 데 효과적이며, 특히 흔히 변동성이 큰 암호화폐 시장에서 안정적인 진입 신호를 제공할 수 있습니다.
 * 언제 사고 언제 파는가: 단기 이동평균선이 장기 이동평균선을 돌파할 경우 매수 신호를, 반대의 경우 매도 신호를 발생시킵니다. 
 * 언제 안 먹히나: 시장이 횡보하거나 변동성이 낮은 경우, 이 전략은 추세를 놓칠 수 있습니다.
 */

function onUpdate(ctx) {
  // 20과 50일 단기 및 장기 이동평균선 계산
  const short = ctx.sma(20, 0);
  const long = ctx.sma(50, 0);
  const prevShort = ctx.sma(20, 1);
  const prevLong = ctx.sma(50, 1);

  // 이동평균선이 null이 아닌지 확인
  if (short == null || long == null || prevShort == null || prevLong == null) return null;

  // 단기 이평선이 장기 이평선을 돌파한 경우 (매수 신호)
  if (prevShort <= prevLong && short > long) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 장기 이평선이 단기 이평선을 돌파한 경우 (매도 신호)
  if (prevShort >= prevLong && short < long) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
