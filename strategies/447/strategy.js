/*
 * @coinsori-strategy v1
 * name: 하이브리드 RSI-BB-MACD 전략
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: RSI와 볼린저밴드, 그리고 MACD를 결합하여 시장 상황에 따라 적절한 진입과 청산 신호를 얻고자 합니다. 이러한 지표들을 함께 사용하면 시장의 동향을 보다 정확하게 파악하고, 과적합 방지를 위한 보완적인 요소를 더할 수 있습니다.
 * 언제 사고 언제 파는가: RSI가 30 이하에서 볼린저밴드 하단과 MACD 신호가 긍정적일 때 매수 주문을 합니다. 반대로 RSI가 70 이상이고 볼린저밴드 상단, 그리고 MACD 신호가 부정적일 때 매도 주문을 합니다.
 * 언제 안 먹히나: 강한 편향된 추세가 계속続く 경우, 혹은 지표들이 서로 다른 방향으로 움직이는 경우 전략의 효율이 낮아질 수 있습니다. 특히 급격한 가격 변동이나 뉴스 기반 이벤트 발생 시 잘못된 신호를 내는 경우가 있을 수 있습니다.
 */
function onUpdate(ctx) {
  // 지표 계산
  const rsi = ctx.rsi(14);             // RSI 지표 (14-period)
  const bb = ctx.bb(20, 2);            // 볼린저 밴드 (20-period, 2-standard deviation)
  const macd = ctx.macd(12, 26, 9);    // MACD (12, 26, 9-period)

  // 이전 봉의 지표 값
  const rsiPrev = ctx.rsi(14, 1);
  const bbPrev = ctx.bb(20, 2, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);

  // RSI가 30 이하일 때 매수 신호를 기다림 (RSI 하향 반전)
  const rsiBuyCondition = rsi !== null && rsiPrev !== null &&
                          rsi < 30 && rsiPrev >= 30;
                          
  // RSI가 70 이상일 때 매도 신호를 기다림 (RSI 상향 반전)
  const rsiSellCondition = rsi !== null && rsiPrev !== null &&
                           rsi > 70 && rsiPrev <= 70;

  // 볼린저밴드 하단에서 매수 / 상단에서 매도
  const bbBuyCondition = bb !== null && bbPrev !== null &&
                        ctx.price < bb.lower && bbPrev.upper <= ctx.price;
                        

  const bbSellCondition = bb !== null && bbPrev !== null &&
                          ctx.price > bb.upper && bbPrev.lower >= ctx.price;

  // MACD의 교차를 통한 진입 신호
  const macdBuyCondition = macd !== null && macdPrev !== null &&
                           macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal;
                           
  const macdSellCondition = macd !== null && macdPrev !== null &&
                            macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal;

  // 매수 조건: RSI 하향반전 + 볼린저밴드 하단에서의 교차 + MACD 긍정적
  if (rsiBuyCondition && bbBuyCondition && macdBuyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // 매도 조건: RSI 상향반전 + 볼린저밴드 상단에서의 교차 + MACD 부정적
  if (rsiSellCondition && bbSellCondition && macdSellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  // 매수 조건이 충족되지 않으면 아무것도 하지 않음
  return null;
}
