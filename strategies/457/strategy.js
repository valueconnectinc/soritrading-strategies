/*
 * @coinsori-strategy v1
 * name: 볼린저 밴드와 RSI 기반 진입 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 볼린저 밴드를 함께 사용하여 매수/매도 시그널을 생성합니다. RSI는 과매수/과매도 상태를 감지하고, 볼린저 밴드는 가격의 폭을 확인하여 진입 타이밍을 보완합니다. RSI가 30 이하이고 하단 밴드에 도달한 경우 매수, RSI가 70 이상이고 상단 밴드에 도달한 경우 매도하는 방식으로 포지션을 관리합니다.
 * 언제 사고 언제 파는가: RSI가 30 이하이고 가격이 하단 볼린저 밴드에 닿은 경우 매수, RSI가 70 이상이고 가격이 상단 볼린저 밴드에 도달한 경우 매도합니다.
 * 언제 안 먹히나: 급격한 시세 변화나 뉴스 등을 포함한 불확실한 시장에서 볼린저 밴드와 RSI 모두가 정확한 신호를 주지 못할 수 있습니다. 이는 시가와 종가의 차이가 너무 커서 트레이딩 신호가 발생하지 않는 경우도 포함됩니다.
 */

function onUpdate(ctx) {
  // 지표 계산
  const rsi = ctx.rsi(14);
  const bb = ctx.bb(20, 2); // 기본 볼린저 밴드 (기본값: 20일, 2σ)
  
  // 이전 값들 
  const prev_rsi = ctx.rsi(14, 1);
  const prev_bb = ctx.bb(20, 2, 1);

  // 유효한 데이터가 아니면 종료
  if (rsi == null || bb == null || prev_rsi == null || prev_bb == null) return null;

  // 볼린저 밴드 하단과 현재 가격 비교 (매수 조건)
  if (rsi < 30 && ctx.price <= bb.lower) {
    if (ctx.position == 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // 볼린저 밴드 상단과 현재 가격 비교 (매도 조건)
  if (rsi > 70 && ctx.price >= bb.upper) {
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
