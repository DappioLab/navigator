# Dappio typescript library

# Update history

## 2022/3/29

- Update [documentation](https://hackmd.io/@happyeric77/H1iJ_6xWc) & some new functions
- No breaking change

### Raydium:

- Update deposit & withdraw instruction
- Deprecate old version of deposit & withdraw instruction
- Add new feature: getLedgerInfos & getAssociatedLedgerAccount
- Slightly classify the Raydium/index routing status (Adding missing items).

### Saber

- Slightly classify the Raydium/index routing status (Adding missing items).

## [2022/3/24](https://hackmd.io/@happyeric77/rJiaLRYfq)

- Raydium protocol: Add getAllLedgers function
- Raydium protocol: Add some Raydium struct (does not have breaking change)

# Usage

## Saber test

```bash
$ solana airdrop 10
$ yarn deposit
$ yarn withdraw
$ yarn claim
```

## Katana test

```bash
$ solana airdrop 10
$ yarn coverCall
# make sure there's USDC balance in the wallet first
$ yarn putSell
```

## Larix Test

```bash
$ solana airdrop 1
$ yarn larixTest
```

## Francium Test

```bash
$ yarn start
```
