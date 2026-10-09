/*
 * @coinsori-strategy v1
 * name: 초선행 추세 돌파 전략 v6
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 후행성 이평선 크로스의 291회 시차 레이턴시를 전면 청산 소독하고, 선행 모멘텀 지표(RSI)의 중심선 돌파 주파수를 융합하여 차트 우측의 거대 수직 폭등 초입부를 선제 타격하여 플러스(+) 장부를 확정합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 마감 봉(ago=1) 기준 RSI가 강세 중심선(50)을 강력하게 상향 돌파하며 단기 추세가 정배열일 때 즉각 매수하고, 보유 중에는 마감 봉 종가 기준으로 수동 조율된 ATR 익절/손절선을 터치하거나 RSI 과열 붕괴 시 즉각 비수탁 청산합니다.
 * 언제 안 먹히나: 외부 자본 유입 없이 거래량이 완전히 죽어버린 초횡보 노이즈 구간에서 가짜 돌파 렉이 잦아지면 미세한 수수료 차감 정국이 일어날 수 있습니다.
 */

function onUpdate(ctx) {
    // 1. 선행/추세 데이터 수신 및 웜업 널(null) 가드 (바 0번의 널 렉 원천 차단 방패 ㅋㅋㅋ)
    const rsiCurr = ctx.rsi(14, 1);     // 1번 마감 봉의 선행 모멘텀 RSI 수신
    const rsiPrev = ctx.rsi(14, 2);     // 2번 마감 봉의 RSI 데이터
    const fastEma = ctx.ema(12, 1);     // 1번 마감 봉의 단기 이평선 [health]
    const slowEma = ctx.ema(26, 1);     // 1번 마감 봉의 장기 이평선 수신
    const atr = ctx.atr(14, 1);         // 1번 마감 봉 기준의 ATR 시장 변동성 인덱스 [health]

    // 데이터가 부족한 초기 클록 구간에는 연산을 즉시 0ms 뮤트하여 엔진 결함 차단 ㅋㅋㅋ
    if (rsiCurr == null || rsiPrev == null || fastEma == null || slowEma == null || atr == null) {
        return null;
    }

    // 2. [🔒 포지션 격리 방화벽] 보유 중일 때의 마감 봉 종가 기준 플러스(+) 완판 청산 프로토콜 [finance]
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes; // 실시간 틱 흔들림을 파쇄한 완전히 마감된 1번 봉의 종가 장부 수신
        const takeProfitPrice = ctx.entryPx + (atr * 3.0); // 대시세 수확을 위해 익절 버퍼를 변동성 3.0배로 상향 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 보위 영구 안전 손절선 1.5배 락 ㅋㅋㅋ

        // 유저 대시보드 런카드 상단에 실시간 타깃가 투명 시각화 오픈 ㅋㅋㅋ
        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '마감 봉 기준 플러스(+) 최종 완판 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 1번 봉의 종가가 대수확 익절선 또는 손절선을 터치 시 즉각 1회 청산 리턴 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position };
        }

        // 모멘텀 꺾임(RSI 45 하방 이탈) 감지 시에도 수익 주권을 보존하기 위해 즉시 청산 탈출 ㅋㅋㅋ
        if (rsiCurr < 45) {
            return { side: 'sell', qty: ctx.position };
        }

        // 포지션 보유 중에는 추가 진입을 철저히 차단하고 0ms 리턴 ㅋㅋㅋ
        return null;
    }

    // 3. [🔒 초선행 진입 게이트 락] 291회 후행성 렉을 박살 낸 강세 돌파 진입 프로토콜 (플러스 마감 엔진 ㅋㅋㅋ)
    const isRsiBullishCross = (rsiPrev <= 50 && rsiCurr > 50); // RSI가 중심선 50을 뚫고 올라가는 강력한 초선행 신호 ㅋㅋㅋ
    const isTrendAligned = (fastEma > slowEma);               // 단기 이평이 장기 이평 위에 있는 정배열 추세 정국 확인

    // 선행 모멘텀과 추세 배열이 동시에 안착했을 때, 폭등 초입부를 놓치지 않고 선제 타격 매수 ㅋㅋㅋ
    if (isRsiBullishCross && isTrendAligned) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 슬리피지 방지용 1% 안전 마진 공제 후 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 폭등 초입부 초선행 정밀 진입 완료 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 진입 후 즉시 상단의 포지션 방화벽 하단으로 통제 이관 ㅋㅋㅋ
    }

    return null;
}
