/*
 * @coinsori-strategy v1
 * name: 기본 이동평균 크로스오버 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 단순한 이동평균선의 상승/하락 추세를 기반으로 매수/매도 결정을 내리는 전통적인 접근 방식입니다.
 * 언제 사고 언제 파는가: 짧은 기간 이동평균선(5일)이 긴 기간 이동평균선(20일)을 위로 뚫는 경우 매수, 아래로 뚫는 경우 매도합니다.
 * 언제 안 먹히나: 시장이 강세 또는 약세 상태에서 지속적인 추세를 보일 때에는 전략의 효과가 줄어들 수 있습니다.
 */

function onUpdate(ctx) {
    // 이동평균선 계산
    const sma5 = ctx.sma(5);
    const sma20 = ctx.sma(20);
    const price = ctx.price;
    
    // 5일 이동평균선이 20일 이동평균선을 돌파한 경우 매수
    if (sma5 != null && sma20 != null && sma5 > sma20) {
        // 단, 현재 포지션이 없을 때만 매수
        if (ctx.position <= 0) {
            return { side: 'buy', qty: ctx.cash / price * 0.95 };
        }
    }
    
    // 5일 이동평균선이 20일 이동평균선 아래로 뚫은 경우 매도
    if (sma5 != null && sma20 != null && sma5 < sma20) {
        // 단, 현재 포지션이 있을 때만 매도
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
    }
    
    return null;
}
