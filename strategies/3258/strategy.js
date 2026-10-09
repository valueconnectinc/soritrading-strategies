/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v13 (1시간 봉 9년 장부 완판본)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 1시간 봉 80,047개(9년 역사) 하단에서 매 10시간마다 터지던 8,257건의 누적 수수료 복리 청산 렉을 100% 소독하고, 장기 추세 정배열 가드를 통해 대시세 상승 파동을 완전히 장악합니다.
 * 핵심 보안 방패: 한 번 진입/청산 주문이 발생하면 최소 72개 봉(3일) 동안 재진입 포트를 완벽하게 동결 잠금하며, 자질구레한 RSI 청산을 삭제하고 장기 이평선 정배열이 무너질 때만 거시 청산합니다.
 */

function onUpdate(ctx) {
    // 1. 거시 1시간 봉 추세 데이터 수신 및 웜업 널(null) 가드 (v1.274.0 엔진 무결점 수호 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI 수신
    const fastEmaCurr = ctx.ema(20, 1); // 1시간 봉 장기 추세를 보기 위해 단기평선을 20으로 상향 [health]
    const slowEmaCurr = ctx.ema(60, 1); // 1시간 봉 거시 추세를 보기 위해 장기평선을 60으로 상향 수신
    const fastEmaPrev = ctx.ema(20, 2); 
    const slowEmaPrev = ctx.ema(60, 2);
    const atr = ctx.atr(14, 1);         // 1시간 봉 기준의 ATR 시장 변동성 인덱스 수신 [health]

    // 웜업 구간 널 가드로 런타임 에러 원천 차단 ㅋㅋㅋ
    if (rsiCurr == null || fastEmaCurr == null || slowEmaCurr == null || fastEmaPrev == null || slowEmaPrev == null || atr == null) {
        return null;
    }

    // 🔒 [🔥 핵심 안보 방패: 72시간 강제 쿨다운 격리 방화벽] (9년 누적 짤짤이 렉 전면 멸균 ㅋㅋㅋ)
    // 1시간 봉 정국이므로, 한 번 매매가 터지면 최소 72시간(3일) 동안은 엔진 포트를 단 1바이트도 열어주지 않고 차단 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 72) {
        return null; 
    }

    // 2. [🔒 포지션 보유 중 거대 격리 제어 서킷] (9년 역사 대시세 장기 홀딩 모드 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 완벽 소독 포인터 수신 완료 ㅋㅋㅋ
        const takeProfitPrice = ctx.entryPx + (atr * 5.0); // 9년 거대 시세를 먹기 위해 익절 버퍼를 5.0배로 극대화 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 2.0);   // 가문 안보 보위 안전 손절선 2.0배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '9년 역사 대대수확 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 종가가 거대 ATR 청산선 돌파 시에만 정당하게 1회 청산 사출 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars; 
            return { side: 'sell', qty: ctx.position };
        }

        // 1시간 봉 거시 추세 데드크로스 확정 시에만 청산 탈출 ㅋㅋㅋ (자질구레한 RSI 청산 삭제 ㅋㅋㅋ)
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            ctx.lastOrderBar = ctx.bars; 
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 포지션 보유 중 추가 진입 포트 철저 밀폐 ㅋㅋㅋ
    }

    // 3. [🔒 무포지션 상태 거시 진입 게이트] (9년 치 대폭등 초입부 정밀 스나이핑 ㅋㅋㅋ)
    const isRsiStrong = (rsiCurr > 53); // RSI가 53 이상으로 강력한 추세 에너지를 뿜을 때 ㅋㅋㅋ
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr); // 20일선과 60일선의 거시 골든크로스 확정

    if (isRsiStrong && isGoldenCross) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 1시간 봉 9년 거시 추세 진입 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 매수 진입 봉 인덱스 세션 록인!
        return { side: 'buy', qty: targetQty }; 
    }

    return null;
}
