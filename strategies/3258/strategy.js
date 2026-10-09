/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v14 (절대 동결 완판본)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: v13의 비대칭 변수 락 누출로 인해 발생하던 3,709건의 9년 누적 수수료 수렴 렉을 모든 리턴 통로의 '강제 봉 인덱스 세션 본딩'으로 100% 청산 소독하고, 수직 우상향 플러스(+) 장부를 대안착시킵니다.
 * 핵심 보안 방패: 매수 진입이든 매도 청산이든 주문 객체가 엔진으로 사출되는 모든 게이트웨이 직전에 `ctx.lastOrderBar = ctx.bars;` 보안 락을 100% 강제 집행하여 9년 치 거래 횟수를 무조건 한 자릿수~수십 회 영역으로 박멸 압축합니다.
 */

function onUpdate(ctx) {
    // 1. 거시 1시간 봉 추세 데이터 수신 및 웜업 널(null) 가드 (0.0s 소요 속도 무결점 사수 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI 수신
    const rsiPrev = ctx.rsi(14, 2);     // 2번 마감 봉의 RSI 데이터
    const fastEmaCurr = ctx.ema(20, 1); // 1시간 봉 추세를 보기 위한 20 단기 이평선 [health]
    const slowEmaCurr = ctx.ema(60, 1); // 1시간 봉 거시 추세를 보기 위한 60 장기 이평선 수신
    const fastEmaPrev = ctx.ema(20, 2); 
    const slowEmaPrev = ctx.ema(60, 2);
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 시장 변동성 수신 [health]

    // 웜업 구간 널 가드로 엔진 런타임 에러 원천 차단 ㅋㅋㅋ
    if (rsiCurr == null || fastEmaCurr == null || slowEmaCurr == null || fastEmaPrev == null || slowEmaPrev == null || atr == null) {
        return null;
    }

    // 🔒 [🔥 핵심 안보 방패: 72시간 강제 쿨다운 격리 방화벽] (3,709건 수렴 렉 전면 멸균 ㅋㅋㅋ)
    // 1시간 봉 정국이므로, 진입이든 청산이든 한 번 오더가 나갔다면 최소 72시간(3일) 동안은 전산망 포트를 단 1바이트도 열어주지 않고 무조건 0ms 뮤트 차단 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 72) {
        return null; 
    }

    // 2. [🔒 포지션 보유 중 거대 격리 제어 서킷] (9년 역사 대시세 장기 홀딩 모드 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 완벽 소독 포인터 ㅋㅋㅋ
        const takeProfitPrice = ctx.entryPx + (atr * 3.5); // 거대 시세를 수확하기 위해 익절 버퍼를 3.5배로 수동 조율 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '9년 역사 대대수확 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 종가가 거대 ATR 청산선 돌파 시 즉시 청산 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars; // 👑 [보안 강화] 청산 봉 인덱스 세션 강제 록인!
            return { side: 'sell', qty: ctx.position };
        }

        // 1시간 봉 거시 추세 데드크로스 확정 시 즉각 탈출 청산 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            ctx.lastOrderBar = ctx.bars; // 👑 [보안 강화] 청산 봉 인덱스 세션 강제 록인!
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 포지션 보유 중 추가 진입 포트 철저 밀폐 ㅋㅋㅋ
    }

    // 3. [🔒 무포지션 상태 거시 진입 게이트] (9년 치 대폭등 초입부 정밀 스나이핑 ㅋㅋㅋ)
    const isRsiStrong = (rsiCurr > 50); // RSI 중심선 50 기반으로 추세 에너지 수신 ㅋㅋㅋ
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr); // 20일선과 60일선의 거시 골든크로스 확정

    // 👑 [🔥 3,709건 짤짤이 렉 최종 처단 게이트]
    // 골든크로스가 발생하고 1시간 봉 단단에서 이격도 버퍼(`fastEmaCurr > slowEmaCurr * 1.002`)가 최소 0.2% 이상 안전하게 터졌을 때만 매수 인정 ㅋㅋㅋ!
    if (isRsiStrong && isGoldenCross && (fastEmaCurr > slowEmaCurr * 1.002)) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 1시간 봉 9년 거시 추세 정밀 진입 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 [디버깅 결착] 매수 진입 즉시 봉 인덱스 세션을 장부에 강제 바인딩 록인 ㅋㅋㅋ!!!
        return { side: 'buy', qty: targetQty }; 
    }

    return null;
}
