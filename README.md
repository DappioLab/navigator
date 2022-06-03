# Dappio typescript library

# Usage

## Farm test

Simply use `npm run test` to start testing Raydium and Saber amm farming features

Before doing the test please following the steps below:

1. Create a test wallet address from your phantom wallet.
2. export the wallet address to solana cli interface.

- get the secret phrases from phantom browser extension and copy it to clipboard.
- export the certain wallet derived from your secret phrase. Change the first 0 to the wallet index you want to export

```
solana-keygen recover 'prompt:?key=0/0' -o ~/.config/solana/dappio-1.json
```

- make sure the solana cli config is under dappio mainnet fork

```
Config File: /Users/macbookpro4eric/.config/solana/cli/config.yml
RPC URL: https://rpc-mainnet-fork.dappio.xyz
WebSocket URL: https://rpc-mainnet-fork.dappio.xyz/ws
Keypair Path: /Users/macbookpro4eric/.config/solana/dappio-1.json
Commitment: confirmed
```

- Airdrop 1 sol by `solana airdrop 1`
- exchange Some RAY [here](https://solana-dapp-boilerplate.vercel.app/)
- Stake the RAY into [Staking farm](https://raydium.io/staking/) in Raydium dapp (Remember to change the RPC to dappio-mainnet-fork: https://rpc-mainnet-fork.dappio.xyz )

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
