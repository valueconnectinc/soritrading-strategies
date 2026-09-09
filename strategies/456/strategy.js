/*
 * @coinsori-strategy v1
 * name: RSI와 MACD 기반 복합 진입 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 MACD를 함께 사용하여 더 강력한 진입 신호를 생성하려고 합니다. RSI는 과매수/과매도 상태를 감지하고, MACD는 추세 방향을 판단합니다. 두 지표를 동시에 만족하는 조건에서만 진입합니다.
 * 언제 사고 언제 파는가: RSI가 30 이하일 때 MACD가 상승 추세면 매수 신호, RSI가 70 이상이고 MACD가 하락 추세면 매도 신호로 포지션을 청산합니다. 
 * 언제 안 먹히나: 강한 단기 랜덤 움직임(예: 뉴스 등)이 발생할 경우, RSI와 MACD 모두가 정확한 신호를 주지 못하는 상황에서 손실이 커질 수 있습니다.
 */

function onUpdate(ctx) {
  // RSI와 MACD 계산
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  
  // 이전 값 저장 (ago=1)
  const prev_rsi = ctx.rsi(14, 1);
  const prev_macd = ctx.macd(12, 26, 9, 1);

  // 유효한 데이터가 아니면 종료
  if (rsi == null || macd == null || prev_rsi == null || prev_macd == null) return null;
  
  // MACD 시그널이 정의되지 않으면 종료 (필수 조건)
  if (macd.signal == null || prev_macd.signal == null) return null;

  // 매수 조건: RSI < 30 AND MACD가 상승 추세 (MACD[0] > MACD[1])
  if (rsi < 30 && macd.macd > prev_macd.macd) {
    // 현재 포지션이 없는 경우에만 매수
    if (ctx.position == 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // 매도 조건: RSI > 70 AND MACD가 하락 추세 (MACD[0] < MACD[1])
  if (rsi > 70 && macd.macd < prev_macd.macd) {
    // 현재 포지션이 있다면 매도
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
