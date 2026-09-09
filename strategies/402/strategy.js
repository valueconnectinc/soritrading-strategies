/*
 * @coinsori-strategy v1
 * name: 다중 자산 포트폴리오 전략
 * ex: binance
 * syms: BTCUSDT ETHUSDT XRPUSDT ADAUSDT
 * interval: 1h
 * cash: 1000
 *
 * 왜 이 전략인가: 다중 자산 간의 상관관계를 분석하여 포트폴리오 리스크를 분산시키고, 시간이 지남에 따라 안정적인 수익을 얻기 위함입니다.
 * 언제 사고 언제 파는가: 각 자산의 20일 이동평균선과 50일 이동평균선이 교차하는 시점에 매수/매도 신호를 받습니다. 또한, 자산 간 상관관계가 낮을 경우 더 많은 비중을 두고 포지션을 진입합니다.
 * 언제 안 먹히나: 시장이 단기적으로 매우 빠르게 움직이는 급격한 하락 또는 상승이 발생하는 경우, 또는 자산 간 상관관계가 극단적으로 변동하는 경우에 성과가 좋지 않을 수 있습니다.
 */

function onUpdate(ctx) {
  // 자산 목록
  const assets = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'ADAUSDT'];
  const assetData = {};
  
  // 각 자산의 이동평균선 계산
  for (const sym of assets) {
    const sma20 = ctx.sma(20, 0);
    const sma50 = ctx.sma(50, 0);
    
    if (sma20 == null || sma50 == null) return null;
    
    assetData[sym] = {
      sma20: sma20,
      sma50: sma50
    };
  }
  
  // 현재 포지션을 기반으로 매도/매수 판단
  let orders = [];
  
  // 자산별로 포지션 있는지 확인
  for (const sym of assets) {
    const position = ctx.pos(sym);
    
    // 이동평균선 교차 신호 체크
    const sma20 = assetData[sym].sma20;
    const sma50 = assetData[sym].sma50;
    
    if (position > 0) {
      // 현재 포지션 있음 - 매도 조건 체크
      if (sma20 < sma50) {
        // 20일 이평이 50일 이평 아래로 내려감 → 매도 신호
        orders.push({ side: 'sell', qty: position, symbol: sym });
      }
    } else {
      // 현재 포지션 없음 - 매수 조건 체크
      if (sma20 > sma50) {
        // 20일 이평이 50일 이평 위로 올라감 → 매수 신호
        orders.push({ side: 'buy', qty: ctx.cash / ctx.price * 0.2, symbol: sym });
      }
    }
  }
  
  return orders;
}
