/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v11 (20봉 쿨다운 가드 장전)
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 봉이 바뀔 때마다 매수와 매도 청산을 좀비처럼 반복하던 8,799회 연쇄 스와핑 렉을 20봉 강제 쿨다운 방화벽과 순정 데드크로스 청산 서킷으로 100% 청산 소독합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉(ago=1) 기준 RSI가 강세 중심선(50)을 확실하게 뚫고 EMA가 정배열일 때 매수하며, 보유 중에는 마감 봉 종가(`ctx.closes.at(-2)`) 기준으로 명확한 ATR 익절(3.0배)/손절(1.5배)을 터치하거나 단단한 데드크로스 확정 시에만 청산합니다.
 * 핵심 보안 방패: 한 번 진입/청산 거래가 발생하면 엔진 레지스터 단단에서 최소 20개의 마감 봉이 지나기 전까지 재진입 포트를 완벽하게 동결 잠금합니다.
 */

function onUpdate(ctx) {
    // 1. 선행/추세 데이터 수신 및 웜업 널(null) 가드 (소요 시간 0.0s 광속 엔진 유지 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI
    const rsiPrev = ctx.rsi(14, 2);     // 2번 마감 봉의 RSI 데이터
    const fastEmaCurr = ctx.ema(12, 1); // 1번 마감 봉의 단기 이평선 [health]
    const fastEmaPrev = ctx.ema(12, 2); // 2번 마감 봉의 단기 이평선
    const slowEmaCurr = ctx.ema(26, 1); // 1번 마감 봉의 장기 이평선 수신
    const slowEmaPrev = ctx.ema(26, 2); // 2번 마감 봉의 장기 이평선
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 변동성 주파수 [health]

    if (rsiCurr == null || rsiPrev == null || fastEmaCurr == null || fastEmaPrev == null || slowEmaCurr == null || slowEmaPrev == null || atr == null) {
        return null;
    }

    // 2. [🔒 🔥 핵심 안보 방패: 20봉 강제 쿨다운 격리 방화벽] (연쇄 봉 스와핑 렉 전면 멸균 ㅋㅋㅋ)
    // 한 번 매매가 터지면 다음 봉에서 즉시 엇박자가 뜨는 좀비 현상을 차단하기 위해 20봉(20시간) 동안 자물쇠를 채움 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 20) {
        return null; 
    }

    // 3. [🔒 포지션 보유 중 격리 제어 서킷] (RSI 45 미세 노이즈 털기 필터를 삭제하고 순정 추세 청산 장전)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 완벽 소독 포인터 수신
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 변동성 3.0배 대수확 익절가 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '대폭사 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 고정 마감된 종가가 진짜 ATR 청산선을 터치 시에만 정당하게 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars; // 👑 청산 봉 인덱스 세션 록인!
            return { side: 'sell', qty: ctx.position };
        }

        // [🔥 보정] 자질구레한 RSI 45 엇박자 청산 대신, 확실한 추세 붕괴 데드크로스 확정 시에만 청산 탈출 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            ctx.lastOrderBar = ctx.bars; // 👑 청산 봉 인덱스 세션 록인!
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 포지션 보유 중 자질구레한 노이즈 진입 포트 철저 밀폐 ㅋㅋㅋ
    }

    // 4. [🔒 무포지션 상태 초선행 진입 게이트] (확실한 골든크로스 정배열 안착 타점 저격 ㅋㅋㅋ)
    const isRsiBullish = (rsiCurr > 50); 
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr); // 마감 봉 기준 순정 골든크로스 확정

    if (isRsiBullish && isGoldenCross) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 마감 봉 초선행 1회 정밀 진입 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 매수 진입 봉 인덱스 장부 록인!
        return { side: 'buy', qty: targetQty }; // 주문 사출 후 가드로 이관 ㅋㅋㅋ
    }

    return null;
}
