/*
 * @coinsori-strategy v1
 * name: 볼린저밴드 돌파 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저밴드 상단 돌파 시 강한 상승세 시작 가능성, 하단 돌파 시 하락세 시작 가능성. 이 전략은 해당 돌파 신호를 기반으로 진입.
 * 언제 사고 언제 파는가: 가격이 볼린저밴드 상단을 돌파하면 매수, 하단을 돌파하면 매도. 매수/매도 후에는 1시간 봉 종료 시 종료 (단, 포지션 유지 가능).
 * 언제 안 먹히나: 횡보장에서는 전략이 너무 자주 진입해 손실 발생. 폭발적인 급등/급락은 예측 불가능하여 손절 필요.
 */
function onUpdate(ctx) {
    const bb = ctx.bb(20, 2); // 볼린저밴드 설정: 기간 20, 계수 2
    const close = ctx.candle.close;
    const prevCandle = ctx.candle.prev;

    // 볼린저밴드가 준비되지 않았다면 종료
    if (bb == null || bb.prev == null) return null;

    // 전 직전 봉의 밴드 상단과 하단
    const prevUpper = bb.prev.upper;
    const prevLower = bb.prev.lower;
    
    // 현재 봉의 밴드 상단과 하단
    const currentUpper = bb.upper;
    const currentLower = bb.lower;

    // 매수 조건: 전 봉은 밴드 하단 이하, 현재 봉은 밴드 하단을 돌파하면 매수
    if (prevCandle != null && prevCandle.close <= prevLower && close > currentLower) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // 매도 조건: 전 봉은 밴드 상단 이상, 현재 봉은 밴드 상단을 하향 돌파하면 매도
    if (prevCandle != null && prevCandle.close >= prevUpper && close < currentUpper) {
        return { side: 'sell', qty: ctx.position };
    }
    
    return null;
}
