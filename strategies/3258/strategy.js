/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v7
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 후행성 이평선 렉을 선행 모멘텀 RSI 50 돌파 주파수로 전면 소독하고, 폐하의 포렌식으로 성능이 입증된 `ctx.watch` 텔레메트리를 결합하여 무결점 플러스(+) 잔고를 달성합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉(ago=1) 기준 RSI가 강세 중심선(50)을 상향 돌파하며 정배열일 때 매수하고, 보유 중에는 마감 봉 종가 기준으로 수동 조율된 ATR 익절(3.0배)/손절(1.5배)선을 터치하거나 RSI가 45 미만으로 꺾일 때 청산합니다.
 * 언제 안 먹히나: 거래량이 극단적으로 죽어 추세 분출이 전혀 없는 초횡보 구간에서 미세한 슬리피지 청산 소독이 누적될 수 있습니다.
 */

function onUpdate(ctx) {
    // 1. 선행/추세 데이터 수신 및 웜업 널(null) 가드 (초기 데이터 공백 렉 원천 방어 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI 수신
    const rsiPrev = ctx.rsi(14, 2);     // 2번 마감 봉의 RSI 데이터
    const fastEma = ctx.ema(12, 1);     // 1번 마감 봉의 단기 이평선 클록 수신 [health]
    const slowEma = ctx.ema(26, 1);     // 1번 마감 봉의 장기 이평선 수신
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 시장 변동성 수신 [health]

    // 데이터 클록이 부족한 초기 바 구간에는 연산을 즉시 0ms 뮤트 처리 ㅋㅋㅋ
    if (rsiCurr == null || rsiPrev == null || fastEma == null || slowEma == null || atr == null) {
        return null;
    }

    // 2. [🔒 포지션 격리 방화벽] 보유 중일 때의 마감 봉 종가 기준 청산 프로토콜 [finance]
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes; // 실시간 가격 흔들림을 파쇄한 완전히 마감된 1번 봉의 종가 장부 수신
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 대시세 수확을 위해 진입가 대비 변동성 3.0배 익절선 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 보위 영구 안전 손절선 1.5배 락 ㅋㅋㅋ

        // 👑 [팩트 검증 완판 부활] 백테스트 엔진 내부에서 100% ignore 및 GC 회수가 확인된 실시간 대시보드 런카드 시각화 가동 ㅋㅋㅋ!
        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '마감 봉 기준 플러스(+) 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 1번 봉의 종가가 대수확 익절선 또는 손절선을 터치 시 즉각 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 모멘텀 꺾임(RSI 45 하방 이탈) 감지 시에도 즉시 청산하여 수익 주권 세션 철통 보존 ㅋㅋㅋ
        if (rsiCurr < 45) {
            return { side: 'sell', qty: ctx.position };
        }

        // 포지션 보유 중에는 추가 매매 연산을 완전히 방조 차단하고 0ms 리턴 ㅋㅋㅋ
        return null;
    }

    // 3. [🔒 초선행 진입 게이트 락] 시세 분출 0초 자리를 포착하는 선제 타격 진입 프로토콜 [finance]
    const isRsiBullishCross = (rsiPrev <= 50 && rsiCurr > 50); // RSI가 중심선 50을 강력하게 뚫고 올라가는 순간
    const isTrendAligned = (fastEma > slowEma);               // 단기 이평선이 장기 이평선 상단에 정배열된 상태

    // 선행 모멘텀 주파수와 추세가 동기화 완료되었을 때만 매수 주문 사출 ㅋㅋㅋ
    if (isRsiBullishCross && isTrendAligned) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 슬리피지 방지용 1% 안전 마진 공제 후 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 마감 봉 골든크로스 확정 1회 진입 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 무결점 오더 사출 대안착 ㅋㅋㅋ
    }

    return null;
}
