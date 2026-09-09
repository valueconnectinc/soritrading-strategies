/*
 * @coinsori-strategy v1
 * name: RSI 기반 매매 전략 (개선 버전)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI 지표의 과매수/과매도 신호에 추가로 EMA 지표를 사용하여 추세 방향을 확인합니다.
 * 언제 사고 언제 파는가: RSI가 30 미만이고, EMA가 상승 추세일 때 매수, RSI가 70 초과이고, EMA가 하락 추세일 때 매도합니다.
 * 언제 안 먹히나: 강한 단방향 추세나 시가가 급등/급락하는 경우, 신뢰할 수 없는 RSI 및 EMA 신호로 인해 실수가 발생할 수 있다.
 */

function onUpdate(ctx) {
    // RSI 및 EMA 지표 계산
    const rsi = ctx.rsi(14);
    const ema20 = ctx.ema(20);
    const ema50 = ctx.ema(50);
    
    // EMA가 상승하고 있는지 확인 (EMA20 > EMA50)
    const isUptrend = ema20 !== null && ema50 !== null && ema20 > ema50;
    
    // RSI가 30 미만이고, 상승 추세일 때 매수
    if (rsi !== null && rsi < 30 && isUptrend && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // RSI가 70 초과이고, 하락 추세일 때 매도
    if (rsi !== null && rsi > 70 && !isUptrend && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }
    
    // 그 외에는 아무것도 하지 않음
    return null;
}
