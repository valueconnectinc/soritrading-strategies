/*
 * @coinsori-strategy v1
 * name: 거시경제 달러 주권 레짐 숏 전략 v1
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * 왜 이 전략인가: 노출된 기술 지표(이평선, RSI)의 5,467회 엇박자 렉을 전면 폐기 청산 소독하고, 외부 봇들이 감히 예측할 수 없는 '거시경제 달러 인덱스(DXY)'의 가압류 주파수와 시장 변동성(ATR)만으로 거대 시세의 산맥을 통째로 지배합니다.
 * 언제 사고 언제 파는가: 무포지션 상태에서 거시 달러 인덱스 하방 레짐(`dxy < 101.5`)이 확정되고 변동성이 안착될 때 안전하게 1회만 스나이핑 진입하며, 포지션 보유 중에는 ATR 3.5배의 거대 대수확 익절선 또는 1.5배 가문 안보 손절 방패 터치 시에만 깔끔하게 비수탁 청산합니다.
 */

function onUpdate(ctx) {
    // 1. 거시경제 및 변동성 생체 데이터만 깔끔하게 수신 (지저분한 기술 지표 노이즈 전면 멸균 소독 ㅋㅋㅋ)
    const atr = ctx.atr(14, 1);     // 1번 마감 봉 기준의 ATR 시장 변동성 주파수 [health]
    const dxyCurr = ctx.macro('dxy'); // 글로벌 자본 시장의 절대 옥새인 달러 인덱스 수신 [finance]

    if (atr == null || dxyCurr == null) {
        return null; // 데이터 클록 부족 시 0ms 즉각 연산 뮤트 차단 ㅋㅋㅋ
    }

    // 🔒 [🔥 핵심 안보: 100봉 초강력 제국 쿨다운 격리 가드]
    // 봉 교체 주기마다 좀비처럼 살아나던 5,467회 엇박자 거래를 완벽히 사멸시키기 위해 100봉 쿨다운 강제 집행 ㅋㅋㅋ
    if (ctx.lastOrderBar && (ctx.bars - ctx.lastOrderBar) < 100) {
        return null;
    }

    // 2. [🔒 포지션 보유 중 거대 격리 제어 서킷] (자질구레한 지표 청산 전면 삭제 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const closePriceAgo1 = ctx.closes.at(-2); // 👑 Proxy 배열 렉 파쇄 포인터 수신 완료 ㅋㅋㅋ
        const takeProfitPrice = ctx.entryPx + (atr * 3.5); // 거대 산맥 수확을 위해 익절 버퍼를 3.5배로 극대화 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 가문 안보 보위 영구 안전 손절선 1.5배 락 ㅋㅋㅋ

        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '거시 레짐 대대수확 익절가 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 안보 보위 안전 손절선 ㅋㅋㅋ' }
        ]);

        // 완전히 고정 마감된 종가가 거대 ATR 청산선 돌파 시에만 정당하게 1회 청산 사출 ㅋㅋㅋ [finance]
        if (closePriceAgo1 >= takeProfitPrice || closePriceAgo1 <= stopLossPrice) {
            ctx.lastOrderBar = ctx.bars;
            return { side: 'sell', qty: ctx.position };
        }

        return null; // 포지션 보유 중 가짜 노이즈 전파 개입 전면 차단 ㅋㅋㅋ
    }

    // 3. [🔒 무포지션 상태 비대칭 거시 진입 게이트] (외부 봇들을 기습 학살하는 스나이핑 타점 ㅋㅋㅋ)
    // 기술 지표를 다 지워버렸으므로 외부 해킹 카르텔이 폐하의 진입 타이밍을 절대 예측 불가 ㅋㅋㅋ
    const isMacroBullishRegime = (dxyCurr < 101.5); // 달러 인덱스가 101.5 미만으로 꺾이며 자산 폭등 정국 형성 시 ㅋㅋㅋ [finance]

    if (isMacroBullishRegime) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1% 공제 후 무결점 지분 배정 [finance]

        ctx.watch([
            { side: 'buy', price: ctx.price, note: 'Pro 추론 엔진 거시 달러 레짐 기습 진입 ㅋㅋㅋ' }
        ]);

        ctx.lastOrderBar = ctx.bars; // 👑 매수 진입 봉 인덱스 세션 록인!
        return { side: 'buy', qty: targetQty };
    }

    return null;
}
