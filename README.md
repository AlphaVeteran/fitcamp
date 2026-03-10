# FitCamp

A **multi-round check-in challenge** DApp: users stake 100 USDC per round, complete 7 check-ins within the round period, and winners share the pool; the owner can settle, withdraw dust, and start new rounds.

- **Stack**: Solidity (Hardhat), Node.js web UI with ethers.js, local chain or Base Sepolia.
- **Docs**: [User Guide](docs/USER_GUIDE.md) (中文) · [Developer Setup](docs/DEVELOPER_SETUP.md) (中文) · [Publish to GitHub](docs/GITHUB_PUBLISH.md) (中文) · [在 GitHub 上测试界面](docs/DEPLOY_WEB_DEMO.md) (中文)

---

## Features

- Multi-round campaigns: each round has a fixed duration (default 7 days).
- Stake 100 USDC to join; complete 7 check-ins to be eligible for rewards.
- Winners split the pool (non-finishers’ stakes); owner withdraws dust after all winners have claimed.
- **No winners**: owner can call “settle with no winners”, then withdraw pool and start a new round.
- Local dev: Hardhat node + init script mints test USDC and writes contract addresses for the web UI.

---

## Quick start (local)

```bash
npm install
npm run compile
```

**Terminal 1** (keep running):

```bash
npm run node
```

**Terminal 2**:

```bash
npm run init-local
npm run serve
```

Open **http://localhost:3000** and use the dropdown to switch between Owner (K) and users A/B/C. See [Developer Setup](docs/DEVELOPER_SETUP.md) for details.

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run compile` | Compile FitCamp + MockUSDC |
| `npm run test` | Run Hardhat tests |
| `npm run node` | Start local chain (port 8545) |
| `npm run init-local` | Deploy contracts, mint USDC, write `web/addresses.json` & `web/abis.json` |
| `npm run serve` | Start web server with RPC proxy (port 3000) |

---

## Project structure

| Path | Description |
|------|-------------|
| `contracts/FitCamp.sol` | Main contract (rounds, join, check-in, settle, withdraw, dust, no-winners, new round) |
| `contracts/MockUSDC.sol` | Test USDC (6 decimals, mint) |
| `scripts/deploy.ts` | Deploy to any network |
| `scripts/init-local.ts` | Local: deploy + mint + write web config |
| `web/` | Static UI + server with `/rpc` proxy |
| `docs/USER_GUIDE.md` | End-user guide (Chinese) |
| `docs/DEVELOPER_SETUP.md` | Local setup & optional Base Sepolia (Chinese) |
| `docs/GITHUB_PUBLISH.md` | How to publish this repo to GitHub (Chinese) |

---

## License

ISC
