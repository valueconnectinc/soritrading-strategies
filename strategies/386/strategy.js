/*
 * @coinsori-strategy v1
 * name: 시간 기반 매매 전략
 * ex: binance
 * syms: BTC/USDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 단순한 시간 기반 전략으로 시장을 분석하지 않고도 간단하게 매매를 시도할 수 있습니다. 특정 시간에 매수하여 일정 시간 이후 매도하는 방식입니다.
 * 언제 사고 언제 파는가: 1시간마다 매수하여, 2시간 단위로 매도 합니다.
 * 언제 안 먹히나: 시장이 변동성이 클 경우 손실이 커질 수 있으며, 정해진 시간 기준으로 행동하므로 시장의 동향을 고려하지 못합니다.
 */

function onUpdate(ctx) {
    // 1시간 단위로 매수
    if (ctx.i % 2 === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    } else {
        // 2시간 단위로 매도
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
    }
    
    return null;
}
