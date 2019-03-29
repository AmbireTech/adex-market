# adex-market

The market is a RESTful service maintained and hosted by AdEx Network OÜ.

The primary role of the market is to facilitate demand/supply discovery and trading. It keeps record of all campaigns that are currently valid, and allows publishers/advertisers to query that list in order to find what they need.

The market needs to track all on-chain OUTPACE channels and needs to constantly monitor their liveness (>=2/3 validators online and producing new states) and state.

Additional privacy can be achieved by having groups of publishers/advertisers run their own instances of the market - that way, campaigns will be visible only within their private group.

For more information, see [adex-protocol](https://github.com/adexnetwork/adex-protocol)

## ENVIRONMENT
- ```DB_MONGO_NAME``` - Name of database to use in MongoDB
- ```DB_MONGO_URL``` - URL for Mongo
- ```PORT``` - Port
- ```IPFSHOST``` - Host address for ipfs
- ```IPFSPORT``` - Port for ipfs
- ```IPFSPROTOCOL``` - Protocol for IPFS
- ```NODE_ENV``` - Environment for node production/test
- ```API_KEY``` - API key for infura
- ```REDIS_PORT``` - Port for redis
- ```REDIS_HOST``` - Host address for redis
- ```REDIS_PASSWD``` - Password for redis
- ```REDIS_SSL``` - SSL for redis
- ```REDIS_KEY```
- ```REDIS_CERT```
- ```REDIS_CA```
- ```TEST_MARKET_URL``` - Used for integration tests, URL of the server instance used for the tests

## How to run

```
npm start
```
