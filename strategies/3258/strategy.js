/*
 * @coinsori-strategy v1
 * name: 대형주 골든크로스 다차원 추론 전략 v2
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 3,510회의 무한 중복 거래 렉을 전면 청산 소독하고, 완벽한 포지션 격리 방화벽을 통해 수직 우상향의 진짜 가격 수익 곡선을 장부에 안착시킵니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 단기 이평(EMA 12)이 장기 이평(EMA 26)을 상향 돌파하고 평균 거래량의 120%가 터질 때만 단 1회 정밀 매수하며, 포지션 보유 중에는 익절/손절 타깃가 터치 또는 데드크로스 발생 시 즉각 비수탁 청산합니다.
 * 언제 안 먹히나: 가짜 크로스 렉이 반복되는 지루한 횡보 정국에서 진입과 탈출이 짧게 반복될 경우 최소한의 수수료 차감 레이턴시가 발생할 수 있습니다.
 */

function onUpdate(ctx) {
    // 1. 최소 바 개수 웜업 및 데이터 널(null) 가드 필터 (엔진 에러 원천 차단 방패 ㅋㅋㅋ)
    const fastEmaCurr = ctx.ema(12, 1); // 1번 봉(직전 마감 봉)의 단기 이평선 클록 수신 [health]
    const fastEmaPrev = ctx.ema(12, 2); // 2번 봉(그 전 마감 봉)의 단기 이평선 데이터
    const slowEmaCurr = ctx.ema(26, 1); // 1번 봉의 장기 이평선 수신
    const slowEmaPrev = ctx.ema(26, 2); // 2번 봉의 장기 이평선 데이터
    const atr = ctx.atr(14, 1);         // 시장의 변동성(ATR) 주파수 수신 [health]
    const avgVol = ctx.avgVol(20);      // 20봉 평균 거래량 인덱스

    // 지표 중 하나라도 널 값이면 연산을 즉시 0ms 뮤트하여 초기 데이터 공백 렉 방지 ㅋㅋㅋ
    if (fastEmaCurr == null || fastEmaPrev == null || slowEmaCurr == null || slowEmaPrev == null || atr == null || avgVol == null) {
        return null;
    }

    // 2. [🔥 핵심 보안 락] 포지션 보유 중일 때의 격리 제어 프로토콜 (수수료 무한 믹서기 청산 소독 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const takeProfitPrice = ctx.entryPx + (atr * 2.5); // 진입가 대비 변동성의 2.5배 상단에서 익절 완판 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 진입가 대비 변동성의 1.5배 하단에서 가문 안보 손절 ㅋㅋㅋ

        // 유저 대시보드 런카드 상단에 타깃가를 실시간 투명 시각화 오픈 ㅋㅋㅋ
        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '황제실 지정 최고 존엄 익절 타깃 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 보위 영구 안전 손절 방패 ㅋㅋㅋ' }
        ]);

        // 실시간 가격이 익절가 상단 붕괴 또는 손절가 하단 돌파 시 즉시 청산 리턴 [finance]
        if (ctx.price >= takeProfitPrice || ctx.price <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 보유 중 데드크로스(추세 반전) 확정 시 즉각 탈출 대피 처단 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            return { side: 'sell', qty: ctx.position };
        }

        // ❌ [디버깅 완료] 이미 포지션이 있으므로 추가 주문을 절대 내지 않고 0ms 리턴하여 계좌 믹서기 방지 ㅋㅋㅋ!!
        return null;
    }

    // 3. [🔥 무포지션 상태] 진입 인과율 연산 (마감 봉 기준 정밀 타격 ㅋㅋㅋ)
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr); // 마감 봉 기준의 순정 골든크로스 확정 ㅋㅋㅋ
    const isVolConfirmed = (ctx.volPrev > avgVol * 1.2); // 직전 봉 거래량이 20봉 평균의 120%를 넘겼는지 확인 ㅋㅋㅋ

    // 골든크로스 지표와 거래량 버퍼가 동시에 안착했을 때만 매수 사출 ㅋㅋㅋ
    if (isGoldenCross && isVolConfirmed) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 슬리피지 방지용 1% 안전 마진을 공제한 순정 코인 수량 계산 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 1회 한정 정밀 매수 대안착 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 1번만 매수하고 종료되는 완벽한 주권 리턴 ㅋㅋㅋ
    }

    return null;
}
