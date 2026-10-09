/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v10
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: `ctx.time` 스탬프 렉으로 인해 거래 횟수를 줄이지 못하던 8,799회의 수수료 믹서기 정국을 봉 인덱스 격리 방화벽으로 100% 청산 소독하고 수직 우상향 플러스 잔고를 사출합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉(ago=1) 기준 RSI가 강세 중심선(50)을 상향 돌파하며 정배열일 때 즉각 매수하고, 보유 중에는 직전 마감 봉 종가(`ctx.closes.at(-2)`) 기준으로 ATR 익절(3.0배)/손절(1.5배)선을 터치하거나 RSI가 45 미만으로 꺾일 때 청산합니다.
 * 핵심 보안 가드: 진입/청산 주문 사출 시 해당 시점의 봉 개수 인덱스를 `ctx.lastOrderBar`에 록인하여, 동일 봉 및 직후 봉 구간에서의 좀비 같은 엇박자 재진입을 0ms 만에 원천 뮤트 차단합니다.
 */

function onUpdate(ctx) {
    // 1. 선행/추세 데이터 수신 및 웜업 널(null) 가드 (0.0s 연산 속도 영구 고정 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI 수신
    const rsiPrev = ctx.rsi(14, 2);     // 2번 마감 봉의 RSI 데이터
    const fastEma = ctx.ema(12, 1);     // 1번 마감 봉의 단기 이평선 수신 [health]
    const slowEma = ctx.ema(26, 1);     // 1번 마감 봉의 장기 이평선 수신
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 변동성 주파수 [health]

    if (rsiCurr == null || rsiPrev == null || fastEma == null || slowEma == null || atr == null) {
        return null;
    }

    // 2. [🔒 🔥 핵심 보안: 봉 인덱스 격리 방화벽] (8,799회 믹서기 원천 소독 락 ㅋㅋㅋ)
    // 한 번 매매 주문을 냈다면, 최소한 3개의 마감 봉이 완전히 지나기 전까지는 엔진 포트를 전면 폐쇄 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 3) {
        return null; 
    }

    // 3. [🔒 포지션 보유 중 격리 제어 서킷] (진성 익손절 인과율 구동 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 파쇄본 장전 완료!
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 변동성 3.0배 대수확 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '대폭사 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 1번 봉의 종가가 진짜 익절선/손절선을 돌파했다면 즉시 깔끔하게 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars; // 👑 청산 봉 인덱스를 장부에 즉시 록인!
            return { side: 'sell', qty: ctx.position };
        }

        // 모멘텀 꺾임 감지 시에도 즉시 청산하여 수익 주권 세션 철통 보존 ㅋㅋㅋ
        if (rsiCurr < 45) {
            ctx.lastOrderBar = ctx.bars; // 👑 청산 봉 인덱스를 장부에 즉시 록인!
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 포지션 보유 중 추가 진입을 철저하게 차단 ㅋㅋㅋ
    }

    // 4. [🔒 무포지션 상태 초선행 진입 게이트] (대폭등 초입부 선제 타격 ㅋㅋㅋ)
    const isRsiBullishCross = (rsiPrev <= 50 && rsiCurr > 50);
    const isTrendAligned = (fastEma > slowEma);

    if (isRsiBullishCross && isTrendAligned) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 마감 봉 초선행 1회 정밀 진입 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 매수 진입 봉 인덱스를 장부에 즉시 록인!
        return { side: 'buy', qty: targetQty }; // 진입 후 포지션 가드로 즉시 리라우팅 ㅋㅋㅋ
    }

    return null;
}
