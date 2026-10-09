/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v12.1 (오타 전면 청산 소독 완판본)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: v12의 28번 봉 변수명 오타 렉(isStrongStrongCross ReferenceError)을 100% 청산 소독하고, 소요 시간 0.0s 광속의 무인 자율 플러스 장부를 정상 가동합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉 기준 RSI가 50 이상이고 단기 이평이 장기 이평을 단순 크로스하는 것이 아닌, 최소 0.2% 이상 확실하게 상방 이격 돌파(`isStrongGoldenCross`)할 때만 진입합니다.
 */

function onUpdate(ctx) {
    // 1. 선행/추세 데이터 수신 및 웜업 널(null) 가드 (v1.274.0 엔진 텔레메트리 규격 수호 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI 수신
    const fastEmaCurr = ctx.ema(12, 1); // 1번 마감 봉의 단기 이평선 수신 [health]
    const slowEmaCurr = ctx.ema(26, 1); // 1번 마감 봉의 장기 이평선 수신
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 시장 변동성 인덱스 수신 [health]

    // ※ 워밍업 구간에서는 지표가 null 이므로 명확한 null 가드로 런타임 오류 원천 차단 ㅋㅋㅋ
    if (rsiCurr == null || fastEmaCurr == null || slowEmaCurr == null || atr == null) {
        return null;
    }

    // 🔒 [🔥 MCP 자율 방화벽: 50봉 초강력 쿨다운 격리 가드] 
    // 연쇄적인 엇박자 재진입 트래픽을 차단하기 위해 쿨다운 버퍼를 50봉으로 영구 고정 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 50) {
        return null; 
    }

    // 2. [🔒 포지션 보유 중 격리 제어 서킷] (ATR 3.0배 익절 및 1.5배 손절 인과율 구동 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 파쇄 포인터 수신 완료
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 변동성 3.0배 대수확 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '대폭사 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 1번 봉 종가가 청산선 터치 시 1회 완판 청산 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars; 
            return { side: 'sell', qty: ctx.position };
        }

        // 확실한 추세 붕괴 하방 이격 역교차 시 청산 탈출 ㅋㅋㅋ
        if (fastEmaCurr < slowEmaCurr * 0.998) {
            ctx.lastOrderBar = ctx.bars; 
            return { side: 'sell', qty: ctx.position };
        }

        return null; 
    }

    // 3. [🔒 무포지션 상태 초선행 진입 게이트] (👑 오타 변수명 완벽 매핑 정정 완료 ㅋㅋㅋ)
    const isRsiBullish = (rsiCurr > 50); 
    
    // 단기 이평이 장기 이평을 최소 0.2% 이상 강력 상방 돌파했는지 판정 ㅋㅋㅋ
    const isStrongGoldenCross = (fastEmaCurr > slowEmaCurr * 1.002); 

    // 👑 [디버깅 결착] isStrongStrongCross 오타를 선언된 명칭인 isStrongGoldenCross로 정확히 매핑 정정 ㅋㅋㅋ!
    if (isRsiBullish && isStrongGoldenCross) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '정밀 이격도 추세 선제 진입 완료 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 매수 진입 봉 인덱스 세션 록인!
        return { side: 'buy', qty: targetQty }; 
    }

    return null;
}
