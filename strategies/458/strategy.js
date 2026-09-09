/*
 * @coinsori-strategy v1
 * name: 볼린저밴드 RSI 개선전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 볼린저밴드를 조합하여 과거의 과도한 매수/매도 신호를 줄이고, 추세 진입 시점을 더 정확하게 잡고자 합니다.
 * 언제 사고 언제 파는가: RSI가 30 미만일 때 볼린저 밴드 하단에서 매수 신호가 발생하면 매수하고, RSI가 70 초과일 때 볼린저 밴드 상단에서 매도 신호가 발생하면 매도합니다.
 * 언제 안 먹히나: 급격한 가격 변동이 없는 정지된 시장( sideways market )에서는 효과적이지 않으며, RSI의 과매수/과매도 지표가 작동하지 않을 수 있습니다.
 */
function onUpdate(ctx) {
  // 지표 계산
  const rsi = ctx.rsi(14); // RSI 계산
  const bb = ctx.bb(20, 2); // 볼린저 밴드 계산 (기준편차 2)
  
  // 이전 봉의 데이터를 사용하여 크로스 검증
  const rsi_1 = ctx.rsi(14, 1);
  const bb_1 = ctx.bb(20, 2, 1);
  
  // 초기 워밍업 기간을 피하기 위해 null 체크
  if (rsi == null || bb == null || rsi_1 == null || bb_1 == null) {
    return null;
  }
  
  // RSI가 30 미만이면 매수 신호를 기다림
  if (rsi < 30 && rsi_1 >= 30) {
    // 볼린저 밴드 하단에서 매수 신호
    if (ctx.price < bb.lower && ctx.price > bb_1.lower) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  
  // RSI가 70 초과이면 매도 신호를 기다림
  if (rsi > 70 && rsi_1 <= 70) {
    // 볼린저 밴드 상단에서 매도 신호
    if (ctx.price > bb.upper && ctx.price < bb_1.upper) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // 매수/매도 조건이 충족되지 않으면 아무것도 하지 않음
  return null;
}
