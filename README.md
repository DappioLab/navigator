# Dappio Navigator: The Universal Typescript Client for Instantiating DeFi Protocols

## Overview

![](https://hackmd.io/_uploads/SJtWPoyxo.png)

Navigator is a Typescript client for instantiating various of kinds of DeFi protocols. You can use it as a standalone dependency in your own project or together with [Dappio Gateway](https://guide.dappio.xyz/the-universal-rabbit-hole).

## Usage

```typescript
import { PublicKey, Connection } from "@solana/web3.js";
import { raydium } from "@dappio/navigator";

const connection = new Connection("https://api.mainnet-beta.solana.com", {
  commitment: "confirmed",
});

// Fetch all pools
const pools = await raydium.infos.getAllPools(connection);

// Fetch pool (RAY-USDC)
const poolId = new PublicKey("6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg");
const pool = await raydium.infos.getPool(connection, poolId);

// Fetch all farms
const farms = await raydium.infos.getAllFarms(connection);

// Fetch farm (RAY-USDC)
const farmId = new PublicKey("CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS");
const farm = await raydium.infos.getFarm(connection, farmId);
```

## Supported Protocols

| Protocol | Type               |
| -------- | ------------------ |
| Raydium  | Pool / Farm        |
| Orca     | Pool / Farm        |
| Saber    | Pool / Farm        |
| Lifinity | Pool               |
| Solend   | MoneyMarket        |
| Larix    | MoneyMarket / Farm |
| Francium | MoneyMarket        |
| Tulip    | MoneyMarket        |
| Katana   | Vault              |

## Test

Run all tests:

```bash
$ yarn run test
```

Or specifically run test for one specific protocol:

```bash
$ yarn run testRaydium
```
