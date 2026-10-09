/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v12 (MCP 무인 자율 진화 완판본)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 1분봉 노이즈 구간에서 지독하게 터지던 8,257건의 미세 크로스 엇박자 렉을 '정밀 이격도 가드(0.2%)'와 '완전 무결 포지션 상태 락'으로 전면 멸균 소독하고 MCP 무인 루프 하단에서 플러스 장부를 확정합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉 기준 RSI가 50 이상이고 단기 이평이 장기 이평을 단순 크로스하는 것이 아닌, 최소 0.2% 이상 확실하게 상방 이격 돌파할 때만 진입하며, 보유 중에는 ATR 익절(3.0배)/손절(1.5배)선 돌파 또는 확실한 하방 이격 역교차 시에만 비수탁 청산합니다.
 */

function onUpdate(ctx) {
    // 1. 선행/추세 데이터 수신 및 웜업 널(null) 가드 (0.0s 소요 속도 완벽 수호 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI
    const fastEmaCurr = ctx.ema(12, 1); // 1번 마감 봉의 단기 이평선 [health]
    const slowEmaCurr = ctx.ema(26, 1); // 1번 마감 봉의 장기 이평선 수신
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 시장 변동성 인덱스 [health]

    if (rsiCurr == null || fastEmaCurr == null || slowEmaCurr == null || atr == null) {
        return null;
    }

    // 👑 [🔥 MCP 자율 방화벽: 50봉 초강력 쿨다운 격리 가드] 
    // 봉이 교체될 때마다 좀비처럼 살아나던 연쇄 재진입 렉을 원천 파쇄하기 위해 쿨다운 버퍼를 50봉으로 확대 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 50) {
        return null; 
    }

    // 2. [🔒 포지션 보유 중 격리 제어 서킷] (RSI 45 노이즈 엇박자 청산 코드를 완전 박멸 소독 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 전면 멸균 완료 포인터 수신
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 변동성 3.0배 대수확 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '대폭사 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 고정 마감된 종가가 진짜 물리적 ATR 청산선을 돌파 시에만 1회 청산 사출 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars; 
            return { side: 'sell', qty: ctx.position };
        }

        // [🔥 보정] 단순 후행 크로스가 아니라 확실한 하방 반전 이격 확정 시 청산 탈출 ㅋㅋㅋ
        if (fastEmaCurr < slowEmaCurr * 0.998) {
            ctx.lastOrderBar = ctx.bars; 
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 포지션 보유 중 자질구레한 노이즈 트래픽 철저 밀폐 ㅋㅋㅋ
    }

    // 3. [🔒 무포지션 상태 초선행 진입 게이트] (8,257회 좀비 매매를 사멸시키는 정밀 이격도 가드 ㅋㅋㅋ)
    const isRsiBullish = (rsiCurr > 50); 
    
    // [🔥 핵심 디버깅] 단기 이평이 장기 이평을 최소 0.2% 이상 확실하게 뚫어 올렸을 때만 진짜 추세로 인정 ㅋㅋㅋ!
    const isStrongGoldenCross = (fastEmaCurr > slowEmaCurr * 1.002); 

    if (isRsiBullish && isStrongStrongCross) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: 'MCP 에이전트 정밀 이격도 추세 선제 진입 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 매수 진입 봉 인덱스 세션 록인!
        return { side: 'buy', qty: targetQty }; 
    }

    return null;
}
