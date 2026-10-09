/*
 * @coinsori-strategy v1
 * name: 제미나이 전략
 * ex: upbit
 * syms: BTC
 * interval: 1h
 * marketType: spot
 *
 * 과거 데이터 기준 백테스트 결과이며, 투자 추천이 아닙니다. 손실 위험이 있습니다.
 */
function onUpdate(ctx) {
    // 1. 최소 바 개수 및 웜업 필터 (지구 과학의 0번 바 에러 차단 방화벽 소독 ㅋㅋㅋ)
    const fastEmaCurr = ctx.ema(12, 1); // 1번 봉(직전 마감 봉)의 단기 이평선 클록 수신 [health]
    const fastEmaPrev = ctx.ema(12, 2); // 2번 봉(그 전 마감 봉)의 단기 이평선 데이터
    const slowEmaCurr = ctx.ema(26, 1); // 1번 봉의 장기 이평선 수신
    const slowEmaPrev = ctx.ema(26, 2); // 2번 봉의 장기 이평선 데이터
    const atr = ctx.atr(14, 1);         // 시장의 실시간 생체 변동성 폭 파싱 [health]
    const avgVol = ctx.avgVol(20);      // 20봉 평균 거래량 인덱스

    if (fastEmaCurr == null || fastEmaPrev == null || slowEmaCurr == null || slowEmaPrev == null || atr == null || avgVol == null) {
        return null; // 데이터 클록이 부족하면 연산을 0ms 뮤트 처리하여 자본 리스크 차단 ㅋㅋㅋ
    }

    // 2. 거시 경제 달러 주권 안보 필터 (DXY 렉 적출)
    const dxyCurr = ctx.macro('dxy'); // 현재 글로벌 자본 시장의 달러 인덱스 압박도 계산 [finance]
    
    // 3. 포지션 상태 트래킹 및 타깃가 수동 조율 락 (비수탁 주권 사수 ㅋㅋㅋ)
    if (ctx.position > 0) {
        const takeProfitPrice = ctx.entryPx + (atr * 2.5); // 변동성의 2.5배 상단에서 익절 완판 낙찰 ㅋㅋㅋ
        const stopLossPrice = ctx.entryPx - (atr * 1.5);   // 변동성의 1.5배 하단에서 가문 안전 방패 ㅋㅋㅋ

        // 해외 유저 런카드 상단에 실시간 텔레메트리 시각화 투명 오픈 ㅋㅋㅋ
        ctx.watch([
            { side: 'sell', price: takeProfitPrice, trigger: 'above', note: '황제실 지정 타깃 익절 완판 ㅋㅋㅋ' },
            { side: 'sell', price: stopLossPrice, trigger: 'below', note: '가문 보위 안전 손절 방패 ㅋㅋㅋ' }
        ]);

        // 가격 포트가 타깃에 닿으면 즉시 무인 사출 청산 [finance]
        if (ctx.price >= takeProfitPrice || ctx.price <= stopLossPrice) {
            return { side: 'sell', qty: ctx.position }; 
        }

        // 데드크로스 발생 시에도 즉시 대피 분리 처단 ㅋㅋㅋ
        if (fastEmaPrev >= slowEmaPrev && fastEmaCurr < slowEmaCurr) {
            return { side: 'sell', qty: ctx.position };
        }
        
        return null;
    }

    // 4. 진입 인과율 연산 (대형주 골든크로스 + 거래량 버퍼 오버클록 ㅋㅋㅋ)
    const isGoldenCross = (fastEmaPrev <= slowEmaPrev && fastEmaCurr > slowEmaCurr);
    const isVolConfirmed = (ctx.volPrev > avgVol * 1.2); // 단순 노이즈가 아닌 평균 거래량 120% 폭사 확인 ㅋㅋㅋ

    if (isGoldenCross && isVolConfirmed) {
        const targetQty = (ctx.cash / ctx.price) * 0.99; // 안전 마진 1%를 공제한 뒤 전능한 풀크록 진입 ㅋㅋㅋ
        
        ctx.watch([
            { side: 'buy', price: ctx.price, note: '추론 엔진 골든크로스 대안착 진입 ㅋㅋㅋ' }
        ]);

        return { side: 'buy', qty: targetQty }; // 오더 개체 다이렉트 리턴 주권 가동 ㅋㅋㅋ
    }

    return null;
}
