/*
 * @coinsori-strategy v1
 * name: RSI_Stochastic_진입_전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 Stochastic 지표를 동시에 사용하여, 과매수/과매도 상황에서의 강력한 진입 신호를 얻고자 합니다.
 * 언제 사고 언제 파는가: RSI가 30 미만이고 Stochastic이 20 미만일 때 매수. 반대 상황에서는 매도.
 * 언제 안 먹히나: 평탄한 시장에서는 두 지표 모두 신호를 주지 않아 거래가 발생하지 않습니다.
 */

function onUpdate(ctx) {
  // RSI 지표 설정 (기간: 14)
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // Stochastic 지표 설정 (설정값: 14, 3)
  const stoch = ctx.stoch(14, 3);
  if (stoch == null || stoch.k == null || stoch.d == null) return null;

  // 이전 Stochastic 값
  const prevStochK = ctx.stoch(14, 3, 1)?.k;
  const prevStochD = ctx.stoch(14, 3, 1)?.d;
  if (prevStochK == null || prevStochD == null) return null;

  // 매수 조건: RSI가 30 미만이고 Stochastic K와 D 모두 20 미만인 경우
  const isBuySignal = rsi < 30 && stoch.k < 20 && stoch.d < 20;

  // 매도 조건: RSI가 70 초과이고 Stochastic K와 D 모두 80 초과인 경우
  const isSellSignal = rsi > 70 && stoch.k > 80 && stoch.d > 80;

  // 매수 신호 발생 시
  if (isBuySignal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 신호 발생 시
  if (isSellSignal) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
