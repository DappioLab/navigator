# Change Log

## 2022/4/8

- Change the routing method of farmInstructions in Raydium/index.ts to avoid double exporting interface issue in frontend.
  > export \* from "./farmInstruction";

## 2022/4/7

- Fix Duplicated output from Raydium/ledgerInfo.ts --> getAllLedgers
- Remove the console.assert

## 2022/4/6

- Fix Larix protocol update. See detail [here](https://hackmd.io/@happyeric77/r1ca-YuQ5)
- Move Larix test to mocha test in /test/
  `npm run test_lend`

## 2022/3/29

- Update [documentation](https://hackmd.io/@happyeric77/H1iJ_6xWc) & some new functions
- No breaking change
- Add mocha test section for farm
  - Raydium: deposit, withdraw
  - Saber: deposit, withdraw and claim

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
