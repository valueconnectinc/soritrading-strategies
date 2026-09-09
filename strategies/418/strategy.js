/*
 * @coinsori-strategy v1
 * name: 펀딩 비율 기반 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 펀딩 비율이 급격히 변하는 시점에 포지션을 조절하여, 펀딩 코스트를 줄이고 수익을 극대화하려는 시도입니다.
 * 언제 사고 언제 파는가: 펀딩 비율이 양수에서 음수로 전환될 때 매수하고, 반대 상황에서는 매도합니다.
 * 언제 안 먹히나: 펀딩 비율의 변화가 일정하지 않거나, 시장이 고정된 방향으로 움직일 경우 해당 전략은 효과가 없습니다.
 */

function onUpdate(ctx) {
  // 펀딩 비율을 가져옵니다. (기본적으로 바이낸스에서 제공)
  const funding = ctx.funding;
  if (funding == null) return null;

  // 과거 펀딩 비율을 상태 변수에 저장
  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    s.prevFunding = s.snapFunding ?? null;
    s.lastBarI = ctx.i;
  }
  s.snapFunding = funding;

  // 이전 펀딩 비율이 없으면 종료
  if (s.prevFunding === null) return null;

  // 현재 포지션
  const position = ctx.position;

  // 진입 조건: 이전과 현재 펀딩 비율의 부호가 반대일 경우
  if (s.prevFunding < 0 && funding > 0) {
    // 펀딩이 음수에서 양수로 바뀌었을 때 매수
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (s.prevFunding > 0 && funding < 0) {
    // 펀딩이 양수에서 음수로 바뀌었을 때 매도
    if (position > 0) return { side: 'sell', qty: position };
  }

  return null;
}
