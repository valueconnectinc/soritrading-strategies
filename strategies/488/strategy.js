/*
 * @coinsori-strategy v1
 * name: 다중 자산 페어 트레이딩 전략
 * ex: binance
 * syms: ETHUSDT,BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 시장에서 여러 자산 간의 상관관계를 분석하여 페어 트레이딩을 실시합니다. 특정 자산이 강세이면 다른 자산은 약세일 가능성이 있어 상호 보완적인 포지션을 취함으로써 리스크를 줄입니다.
 * 언제 사고 언제 파는가: ETHUSDT가 상승 추세이고 BTCUSDT가 하락 추세인 경우 ETHUSDT로 진입하고, 반대 경우 BTCUSDT로 진입합니다. 매매 신호는 20일 이동평균선과 MACD 지표를 사용합니다.
 * 언제 안 먹히나: 시장이 급격히 변동하거나 페어 간 상관관계가 거의 없을 경우 효과가 낮습니다.
 */

function onUpdate(ctx) {
    // 기본 변수 설정
    const ethPrice = ctx.price;
    const btcPrice = ctx.ref(1).price;

    // 이동평균선과 MACD가 모두 존재하는 경우에만 신호를 확인
    const ethSma20 = ctx.sma(20, 0);
    const btcSma20 = ctx.ref(1).sma(20, 0);
    const ethMacd = ctx.macd(12, 26, 9, 0);
    const btcMacd = ctx.ref(1).macd(12, 26, 9, 0);

    // 초기 웜업 기간 처리
    if (ethSma20 == null || btcSma20 == null || ethMacd == null || btcMacd == null) {
        return null;
    }

    // ETH가 상승 추세이고 BTC가 하락 추세인지 판단
    const ethTrend = ethSma20 > ctx.sma(20, 1); // 전일보다 현재가 더 높은 경우 상승 추세
    const btcTrend = btcSma20 < ctx.ref(1).sma(20, 1); // 전일보다 현재가 더 낮은 경우 하락 추세

    // ETH가 MACD에서 양의 신호 (MACD > Signal)라면 매수 시그널
    const ethSignal = ethMacd.macd > ethMacd.signal;
    // BTC가 MACD에서 음의 신호 (MACD < Signal)라면 매도 시그널
    const btcSignal = btcMacd.macd < btcMacd.signal;

    // 조건 1: ETH 상승, BTC 하락 + ETH MACD 긍정, BTC MACD 음수 → ETH 진입
    if (ethTrend && !btcTrend && ethSignal && !btcSignal) {
        return { side: 'buy', qty: ctx.cash / ethPrice * 0.99 };
    }

    // 조건 2: BTC 상승, ETH 하락 + BTC MACD 긍정, ETH MACD 음수 → BTC 진입
    if (!ethTrend && btcTrend && !ethSignal && btcSignal) {
        return { side: 'buy', qty: ctx.cash / btcPrice * 0.99 };
    }

    // 종료 조건: 현재 포지션이 있는 경우, 반대 신호가 발생하면 청산
    if (ctx.position > 0) {
        const currentPrice = ctx.price;
        // ETH 진입한 경우 청산 조건 (MACD가 음수로 전환되거나, 이동평균선이 위 아래로 전환됨)
        if (ctx.sym === 'ETHUSDT' && (ethMacd.macd < ethMacd.signal || ethSma20 < ctx.sma(20, 1))) {
            return { side: 'sell', qty: ctx.position };
        }
        // BTC 진입한 경우 청산 조건
        if (ctx.sym === 'BTCUSDT' && (btcMacd.macd > btcMacd.signal || btcSma20 > ctx.ref(1).sma(20, 1))) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
