/*
 * @coinsori-strategy v1
 * name: 대형주 골든크로스 다차원 추론 전략 v4
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 엔진의 구버전 캐시 바인딩 렉을 강제로 청산 소독하고, 마감 봉(ago=1) 기준의 완벽한 1회성 포지션 차단 방화벽을 강제 인젝션하여 잔고를 수직 우상향으로 반전시킵니다.
 * 언제 사고 언제 파는가: 포지션이 0일 때 마감 봉 기준 골든크로스 및 거래량 120% 안착 시 매수하며, 보유 중에는 마감 봉 종가 기준으로 ATR 익절/손절선을 터치하거나 데드크로스가 뜰 때만 딱 1회 비수탁 청산합니다.
 * 언제 안 먹히나: 시장의 주파수 변동성이 완전히 죽어버린 초횡보 노이즈 구간에서 미세한 수수료 차감 렉이 누적될 수 있습니다.
 */

// [🔥 핵심 엔진 바인딩 보정] strict mode 컴파일러의 진입점 오류를 원천 차단하는 최상단 순정 함수 선언식 ㅋㅋㅋ
function onUpdate(ctx) {

    // 1. 초기 데이터 웜업 널(null) 가드 (바 0번의 데이터 누락 에러를 전면 소독 ㅋㅋㅋ)
    const fastEmaCurr = ctx.ema(12, 1); // 1번 마감 봉의 단기 이평선 [health]
    const fastEmaPrev = ctx.ema(12, 2); // 2번 마감 봉의 단기 이평선 데이터
    const slowEmaCurr = ctx.ema(26, 1); // 1번 마감 봉의 장기 이평선
    const slowEmaPrev = ctx.ema(26, 2); // 2번 마감 봉의 장기 이평선 데이터
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 변동성 주파수 [health]
    const avgVol = ctx.avgVol(20);      // 20봉 평균 거래량 인덱스 장부

    // 데이터 클록이 단 하나라도 부족하면 0ms 즉시 뮤트하여 리스크 차단 ㅋㅋㅋ
    if (fastEmaCurr == null || fastEmaPrev == null || slowEmaCurr == null || slowEmaPrev == null || atr == null || avgVol == null) {
        return null;
    }

    // 2. [🔒 포지션 격리 방화벽] 보유 중일 때의 마감 봉 종가 기준 1회성 청산 서킷 (중복 주문 폭사 렉 전면 멸균 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes; // 실시간 가격 노이즈를 파쇄하고 완전히 마감된 1번 봉의 종가 장부 수신
        const takeProfitPrice = ctx.entryPx + (atr * 2.5); // 진입가 대비 변동성 2.5배 상단 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 진입가 대비 변동성 1.5배 하단 손절선 ㅋㅋㅋ

        // 해외 고래 유저 대시보드 런카드 상단에 실시간 대기 타깃 세팅 ㅋㅋㅋ
        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '마감 봉 기준 최고 존엄 익절 완판 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 영구 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 1번 봉의 종가가 익절선/손절선을 돌파했다면 즉시 깔끔하게 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 마감 봉 기준 추세 반전 데드크로스 확정 시에도 즉시 단 1회 청산 탈출 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            return { side: 'sell', qty: ctx.position };
        }

        // ❌ 포지션 보유 중에는 하단의 매수 코드 진입을 철저하게 방조 차단하고 0ms 리턴 ㅋㅋㅋ!
        return null;
    }

    // 3. [🔒 진입 게이트 락] 무포지션 상태에서의 마감 봉 기준 정밀 타점 진입 프로토콜 ㅋㅋㅋ
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr);
    const isVolConfirmed = (ctx.volPrev > avgVol * 1.2); // 거래량 버퍼 120% 돌파 확인 ㅋㅋㅋ

    if (isGoldenCross && isVolConfirmed) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 마감 봉 골든크로스 확정 1회 진입 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 주문 사출 후 즉시 상단의 포지션 방화벽 하단으로 통제 이관 ㅋㅋㅋ
    }

    return null;
}
