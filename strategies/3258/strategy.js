/*
 * @coinsori-strategy v1
 * name: 대형주 골든크로스 다차원 추론 전략 v5
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 거래량 120% 가드 락으로 인해 차트 우측의 거대한 수직 폭등 시세를 놓치던 병목 렉을 전면 청산 소독하고, 순정 이평 크로스 추세를 온전히 수확합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉(ago=1) 기준 순정 골든크로스 확정 시 거래량 족쇄 없이 즉각 정밀 매수하며, 보유 중에는 마감 봉 종가 기준 ATR 익절/손절선 돌파 또는 데드크로스 발생 시 청산합니다.
 * 언제 안 먹히나: 추세 폭등 없이 미세한 크로스 흔들림만 반복되는 지루한 횡보 정국에서 자질구레한 진입 탈출 수수료 소독이 발생할 수 있습니다.
 */

function onUpdate(ctx) {
    // 1. 마감 봉 데이터 수신 및 웜업 널(null) 가드 (바 0번의 데이터 누락 에러 원천 차단 ㅋㅋㅋ)
    const fastEmaCurr = ctx.ema(12, 1); // 1번 마감 봉의 단기 이평선 수신 [health]
    const fastEmaPrev = ctx.ema(12, 2); // 2번 마감 봉의 단기 이평선 데이터
    const slowEmaCurr = ctx.ema(26, 1); // 1번 마감 봉의 장기 이평선 수신
    const slowEmaPrev = ctx.ema(26, 2); // 2번 마감 봉의 장기 이평선 데이터
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 변동성 수신 [health]

    // 데이터가 부족한 초기 클록 구간에는 연산을 즉시 0ms 뮤트 처리 ㅋㅋㅋ
    if (fastEmaCurr == null || fastEmaPrev == null || slowEmaCurr == null || slowEmaPrev == null || atr == null) {
        return null;
    }

    // 2. [🔒 포지션 격리 방화벽] 보유 중일 때의 마감 봉 종가 기준 1회성 청산 프로토콜 [finance]
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes; // 실시간 노이즈를 파쇄하고 완전히 마감된 1번 봉의 종가 장부 수신
        const takeProfitPrice = ctx.entryPx + (atr * 2.5); // 진입가 대비 변동성 2.5배 상단 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 진입가 대비 변동성 1.5배 하단 손절 방패 ㅋㅋㅋ

        // 유저 대시보드 런카드 상단에 실시간 타깃가 투명 시각화 오픈 ㅋㅋㅋ
        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '마감 봉 기준 최고 존엄 익절 완판 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 영구 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 고정 마감된 1번 봉의 종가가 익절선/손절선을 돌파했다면 즉시 깔끔하게 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 마감 봉 기준 추세 반전 데드크로스 확정 시에도 즉시 단 1회 청산 탈출 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            return { side: 'sell', qty: ctx.position };
        }

        // 포지션 보유 중에는 추가 매수를 완벽히 차단하고 0ms 리턴 ㅋㅋㅋ
        return null;
    }

    // 3. [🔒 진입 게이트 락] 거래량 족쇄를 처단한 순정 추세 진입 프로토콜 (대시세 수확 모드 ㅋㅋㅋ)
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr); // 마감 봉 기준 골든크로스 확정

    // [🔥 보정 완료] 대시세 폭등 초입부를 놓치게 만들던 거래량 120% 필터를 과감히 제거하여 추세 즉각 결착 ㅋㅋㅋ!
    if (isGoldenCross) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 대시세 폭등 초입부 정밀 진입 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 진입 후 포지션 가드로 제어권 이관 ㅋㅋㅋ
    }

    return null;
}
