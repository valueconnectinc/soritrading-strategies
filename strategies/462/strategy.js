/*
 * @coinsori-strategy v1
 * name: 하이브리드 기술 지표 전략_개선版2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 다양한 기술 지표의 조합을 통해 더 빈번하게 진입 신호를 생성하고, 수익률을 향상시키고자 함. 특히 MACD와 RSI를 더 유연하게 사용.
 * 언제 사고 언제 파는가: 볼린저 밴드 하단 또는 RSI가 30 이하 시 매수 신호 발생. MACD와 RSI의 상승세가 확인되면 진입. 매도는 수익률이 2% 이상 또는 RSI가 70 이상일 경우.
 * 언제 안 먹히나: 시장이 강한 방향성(상승/하락)을 보이는 경우, 기술 지표들이 의미를 잃거나 신호가 노이즈로 처리될 수 있음.
 */

function onUpdate(ctx) {
  // 지표 계산 (완전한 워밍업 포함)
  const bb = ctx.bb(20, 2, 0);       // 볼린저 밴드 (20일, 2 표준편차)
  const rsi = ctx.rsi(14, 0);        // RSI (14일)
  const macd = ctx.macd(12, 26, 9, 0); // MACD (12, 26, 9)

  const bbPrev = ctx.bb(20, 2, 1);
  const rsiPrev = ctx.rsi(14, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);

  // 볼린저 밴드 하단에서 RSI가 30 이하일 때 매수
  if (bb == null || bbPrev == null || rsi == null || rsiPrev == null || macd == null || macdPrev == null) return null;

  // RSI 하향 후 상승 여부 확인
  const isBullishCrossover = bbPrev.lower > rsiPrev && bb.lower <= rsi;

  // MACD 상승세 확인
  const isMacdRising = macd.macd > macdPrev.macd && macd.signal > macdPrev.signal;

  // 매수 조건: RSI가 30 이하이거나 볼린저 하단 교차 또는 MACD 상승 (보완적 조건)
  if (rsi < 30 || isBullishCrossover || isMacdRising) {
    if (ctx.position === 0) {
      const qty = ctx.cash / ctx.price * 0.95; // 현금의 95%로 매수
      return { side: 'buy', qty: qty };
    }
  }

  // 매도 조건: 수익률이 2% 이상 또는 RSI가 70 이상일 경우
  if (ctx.position > 0) {
    const profit = ctx.uPnl / (ctx.position * ctx.entryPx);
    if (profit >= 0.02 || rsi >= 70) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null; // 아무 동작도 하지 않음
}
