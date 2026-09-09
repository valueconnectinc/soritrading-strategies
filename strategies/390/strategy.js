/*
 * @coinsori-strategy v1
 * name: 다중지표 조합 전략
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 볼린저밴드, MACD, RSI 등 여러 지표를 조합하여 강력한 진입 신호를 생성하려고 합니다. 단일 지표는 과도하게 트리거되거나 놓치는 경우가 많으므로, 여러 지표의 일치를 요구하는 방식으로 매매 결정을 내립니다.
 * 언제 사고 언제 파는가: 볼린저밴드 하단에서 MACD와 RSI가 모두 긍정적인 신호를 보일 때 매수를 시도하고, 반대 상황일 경우 매도합니다. 지표의 조합으로 진입 신호를 강화합니다.
 * 언제 안 먹히나: 빠르게 움직이는 시장이나 횡보 시장에서는 다양한 지표가 동시에 일치하지 않아 매매가 지연될 수 있습니다.
 */
function onUpdate(ctx) {
  // 볼린저밴드 데이터
  const bb = ctx.bb(20, 2, 0);
  if (bb == null) return null;

  // MACD 데이터 (1시간 단위)
  const macd = ctx.macd(12, 26, 9, 0);
  if (macd == null || macd.macd == null || macd.signal == null) return null;

  // RSI 데이터
  const rsi = ctx.rsi(14, 0);
  if (rsi == null) return null;

  // 이전 종가
  const prevClose = ctx.closes[1];
  if (prevClose == null) return null;

  // 현재 가격이 볼린저밴드 하단을 지났는지 확인
  const isBelowBB = ctx.price < bb.lower;

  // MACD가 긍정적인 신호인지 확인 (MACD선이 시그널선 위에 있는 경우)
  const isMacdPositive = macd.macd > macd.signal;

  // RSI가 과매도 지역(30) 하단에서 올라오는지 확인
  const isRsiReversal = rsi < 30 && prevClose > ctx.closes[2]; // 이전 봉에서 과매도 상태에서 현재로 회복된 경우

  // 매수 조건: 볼린저 밴드 하단, MACD 긍정 신호, RSI 반전 신호
  if (isBelowBB && isMacdPositive && isRsiReversal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 조건: 볼린저 밴드 상단, MACD 부정 신호, RSI 반전 신호
  const isAboveBB = ctx.price > bb.upper;
  const isMacdNegative = macd.macd < macd.signal;
  const isRsiReversalSell = rsi > 70 && prevClose < ctx.closes[2]; // 이전 봉에서 과매수 상태에서 현재로 회복된 경우

  if (isAboveBB && isMacdNegative && isRsiReversalSell) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
