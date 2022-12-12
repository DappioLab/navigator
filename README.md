# Dappio Navigator: The Universal Typescript Client for Instantiating DeFi Protocols

## Overview

![](https://hackmd.io/_uploads/rJbWYMd-o.jpg)

Navigator is a Typescript client for instantiating various of kinds of DeFi protocols. You can use it as a standalone dependency in your own project or together with [Dappio Gateway](https://guide.dappio.xyz/the-universal-rabbit-hole).

## Usage

```typescript
import { PublicKey, Connection } from "@solana/web3.js";
import { raydium, orca, tulip, friktion } from "@dappio/navigator";

const connection = new Connection("https://api.mainnet-beta.solana.com", {
  commitment: "confirmed",
});

// Fetch all Raydium pools
const raydiumPools = await raydium.infos.getAllPools(connection);

// Fetch all Orca pools
const orcaPools = await orca.infos.getAllPools(connection);

// Fetch Raydium pool (RAY-USDC)
const poolId = new PublicKey("6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg");
const raydiumPool = await raydium.infos.getPool(connection, poolId);

// Fetch all Raydium farms
const raydiumFarms = await raydium.infos.getAllFarms(connection);

// Fetch all Orca farms
const orcaFarms = await orca.infos.getAllFarms(connection);

// Fetch Raydium farm (RAY-USDC)
const farmId = new PublicKey("CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS");
const raydiumFarm = await raydium.infos.getFarm(connection, farmId);

// Fetch all Tulip vaults
const tulipVaults = await tulip.infos.getAllVaults(connection);

// Fetch all Friktion vaults
const friktionVaults = await friktion.infos.getAllVaults(connection);
```

## Supported Protocols

Check [here](https://universal-rabbit-hole.dappio.xyz/protocols) to see all the supported protocols

## Test

Run all tests:

```bash
$ yarn run test
```

Or specifically run test for one specific protocol:

```bash
$ yarn run testRaydium
```
