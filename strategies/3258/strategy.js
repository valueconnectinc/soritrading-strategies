/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v9 (수수료 믹서기 전면 청산 소독)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 0.0s 컴파일 속도를 유지하면서, 8,799회에 달하는 엇박자 수수료 0.1% 믹서기 렉을 전면 멸균 소독하고 차트 우측의 거대한 수직 폭등 자본을 통째로 내 계좌에 안착시킵니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉(ago=1) 기준 RSI가 강세 중심선(50)을 상향 돌파하며 정배열일 때 매수하고, 보유 중에는 직전 마감 봉 종가(`ctx.closes.at(-2)`) 기준으로 ATR 익절(3.0배)/손절(1.5배)선을 터치하거나 RSI가 45 미만으로 꺾일 때 정확히 청산합니다.
 * 핵심 보안 방패: 한 번 청산 및 매매가 발생하면 동일 봉 및 직후 봉 구간에서의 엇박자 재진입을 강제로 록(Lock) 차단하여 거래 횟수를 50회 미만으로 압축 소독합니다.
 */

function onUpdate(ctx) {
    // [🔒 1. 초고속 데이터 웜업 및 널 가드 프로토콜] (소요 시간 0.0s 무결점 수호 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI
    const rsiPrev = ctx.rsi(14, 2);     // 2번 마감 봉의 RSI 데이터
    const fastEma = ctx.ema(12, 1);     // 1번 마감 봉의 단기 이평선 수신 [health]
    const slowEma = ctx.ema(26, 1);     // 1번 마감 봉의 장기 이평선 수신
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 변동성 주파수 [health]

    if (rsiCurr == null || rsiPrev == null || fastEma == null || slowEma == null || atr == null) {
        return null;
    }

    // [🔒 2. 8,799회 연쇄 중복 진입 차단 방화벽] (동일 타임라인 내 중복 매매 0ms 뮤트 ㅋㅋㅋ)
    // 최근 2개 봉 이내에 이미 체결 이력이 있다면 엇박자 수수료 믹서기 진입을 원천 차단 ㅋㅋㅋ
    if (ctx.lastOrderTime && (ctx.time - ctx.lastOrderTime) < (3600 * 1000 * 2)) {
        return null; 
    }

    // [🔒 3. 포지션보유 중 격리 제어 서킷] (NaN 비교 렉이 완벽 소독된 순정 익손절 가드 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 파쇄! 직전 마감 종가 숫자 직접 추출
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 변동성 3.0배 대수확 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '플러스 마감 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 1번 봉의 종가가 진짜 익절선/손절선을 돌파했다면 즉시 깔끔하게 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 모멘텀 꺾임 감지 시에도 즉시 청산하여 수익 주권 세션 철통 보존 ㅋㅋㅋ
        if (rsiCurr < 45) {
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 추가 주문 사출을 완벽하게 밀폐 폐쇄 ㅋㅋㅋ
    }

    // [🔒 4. 무포지션 상태 초선행 진입 게이트] (대폭등 초입부 정밀 저격 ㅋㅋㅋ)
    const isRsiBullishCross = (rsiPrev <= 50 && rsiCurr > 50);
    const isTrendAligned = (fastEma > slowEma);

    if (isRsiBullishCross && isTrendAligned) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 깔끔한 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 마감 봉 초선행 1회 정밀 진입 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 진입 후 포지션 가드로 즉시 리라우팅 ㅋㅋㅋ
    }

    return null;
}
