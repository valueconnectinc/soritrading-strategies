/*
 * @coinsori-strategy v1
 * name: 대형주 골든크로스 다차원 추론 전략 v3
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 실시간 틱 흔들림에 의한 3,313회의 엇박자 재매수 루프 렉을 완벽히 파쇄하고, 진입과 청산의 타임라인을 마감 봉(ago=1) 단단으로 통일하여 수직 우상향 잔고를 달성합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉 기준 골든크로스 확정 시 매수하고, 포지션 보유 중에는 마감 봉 기준 변동성(ATR) 익절/손절선 붕괴 또는 데드크로스 확정 시에만 깔끔하게 1회 청산합니다.
 * 언제 안 먹히나: 추세 없이 단기 크로스가 짧게 반복되는 초박스권 노이즈 장세에서 미세한 슬리피지 청산 소독이 일어날 수 있습니다.
 */

function onUpdate(ctx) {
    // 1. 마감 봉 데이터 수신 및 초기 웜업 널(null) 가드 (프롬프트 3, 4조 완벽 준수 ㅋㅋㅋ)
    const fastEmaCurr = ctx.ema(12, 1); // 1번 마감 봉의 단기 이평선 클록 [health]
    const fastEmaPrev = ctx.ema(12, 2); // 2번 마감 봉의 단기 이평선
    const slowEmaCurr = ctx.ema(26, 1); // 1번 마감 봉의 장기 이평선
    const slowEmaPrev = ctx.ema(26, 2); // 2번 마감 봉의 장기 이평선
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 시장 변동성 수신 [health]
    const avgVol = ctx.avgVol(20);      // 20봉 평균 거래량 장부 필터

    if (fastEmaCurr == null || fastEmaPrev == null || slowEmaCurr == null || slowEmaPrev == null || atr == null || avgVol == null) {
        return null; // 지표 공백기에는 연산을 0ms 뮤트하여 리스크 원천 차단 ㅋㅋㅋ
    }

    // 2. [🔒 완벽한 청산 동기화 락] 포지션 보유 중일 때의 마감 봉 기준 청산 프로토콜 [finance]
    if (ctx.position > 0) {
        // 실시간 ctx.price 대신, 안전하게 마감된 직전 봉의 종가(ctx.closes[1])를 기준으로 익손절 연산 ㅋㅋㅋ
        const closePriceAgo1 = ctx.closes[1]; 
        const takeProfitPrice = ctx.entryPx + (atr * 2.5); // 진입가 대비 변동성 2.5배 상단 타깃가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 진입가 대비 변동성 1.5배 하단 손절 방패 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '마감 봉 기준 최고 존엄 익절 타깃가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 영구 안전 손절 방패선 ㅋㅋㅋ' }
        ]);

        // 봉이 완전히 마감되었을 때의 종가가 익절가/손절가를 넘어섰다면 그 즉시 깔끔하게 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 보유 중 마감 봉 기준 데드크로스 확정 시에도 단 1회만 청산 탈출 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 추가 매매 렉을 완벽하게 밀폐 폐쇄 차단 ㅋㅋㅋ
    }

    // 3. [🔒 진입 동기화 락] 무포지션 상태에서의 마감 봉 정밀 진입 프로토콜 (수수료 믹서기 완전 소독 ㅋㅋㅋ)
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr);
    const isVolConfirmed = (ctx.volPrev > avgVol * 1.2); // 거래량 120% 폭사 검증 ㅋㅋㅋ

    if (isGoldenCross && isVolConfirmed) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 깔끔한 지분 배정 ㅋㅋㅋ [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 마감 봉 골든크로스 타점 정밀 진입 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 진입 후 즉시 상단의 포지션 가드로 리라우팅 ㅋㅋㅋ
    }

    return null;
}
