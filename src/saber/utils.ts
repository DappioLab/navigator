import BN from "bn.js";

// Saber curve stable swap utils

export const N_COINS = new BN(2); // n
export const ZERO = new BN(0);
export const ONE = new BN(1);

// maximum iterations of newton's method approximation
const MAX_ITERS = 20;

/**
 * Compute the StableSwap invariant
 * @param ampFactor Amplification coefficient (A)
 * @param amountA Swap balance of token A
 * @param amountB Swap balance of token B
 * Reference: https://github.com/curvefi/curve-contract/blob/7116b4a261580813ef057887c5009e22473ddb7d/tests/simulation.py#L31
 */
export const computeD = (ampFactor: BN, amountA: BN, amountB: BN): BN => {
  const Ann = ampFactor.mul(N_COINS); // A*n^n
  const S = amountA.add(amountB); // sum(x_i), a.k.a S
  if (S.eq(ZERO)) {
    return ZERO;
  }

  let dPrev = ZERO;
  let d = S;

  for (let i = 0; d.sub(dPrev).abs().gt(ONE) && i < MAX_ITERS; i++) {
    dPrev = d;
    let dP = d;
    dP = dP.mul(d).div(amountA.mul(N_COINS));
    dP = dP.mul(d).div(amountB.mul(N_COINS));

    const dNumerator = d.mul(Ann.mul(S).add(dP.mul(N_COINS)));
    const dDenominator = d.mul(Ann.sub(ONE)).add(dP.mul(N_COINS.add(ONE)));
    d = dNumerator.div(dDenominator);
  }

  return d;
};

export const normalizedTradeFee = (trade: BN, n_coins: BN, amount: BN): BN => {
  const adjustedTradeFee = n_coins.div(n_coins.sub(ONE).mul(new BN(4)));
  return amount.div(ONE).mul(trade).mul(adjustedTradeFee);
};
