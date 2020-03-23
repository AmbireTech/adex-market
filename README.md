# adex-market

The market is a RESTful service maintained and hosted by AdEx Network OÜ.

The primary role of the market is to facilitate demand/supply discovery and trading. It keeps record of all campaigns that are currently valid, and allows publishers/advertisers to query that list in order to find what they need.

The market needs to track all on-chain OUTPACE channels and needs to constantly monitor their liveness (>=2/3 validators online and producing new states) and state.

Additional privacy can be achieved by having groups of publishers/advertisers run their own instances of the market - that way, campaigns will be visible only within their private group.

For more information, see [adex-protocol](https://github.com/adexnetwork/adex-protocol)

## ENVIRONMENT
- ```NODE_ENV``` - Environment for node. 'production' is for running in production, 'test' is for running integration tests, 'benchmark' is for running benchmark tests
- ```DB_MONGO_NAME``` - Name of database to use in MongoDB
- ```DB_MONGO_URL``` - URL for Mongo
- ```DB_MONGO_USE_TLS``` - Toggles wether mongo should use a TLS certificate. Defaults to false
- ```DB_MONGO_CA``` - Filepath to the mongo CA certificate. Defaults to 'rootCA.crt'
- ```DB_MONGO_CERT``` - Filepath to mongo key. Defaults to 'relayer.pem'
- ```DB_MONGO_KEY``` - Filepath to mongo certificate. Defaults to 'relayer.pem'
- ```DB_MONGO_REPLSET``` - Toggles replica sets. Defaults to false
- ```RELAYER_HOST``` - Host URL for the relayer. Should default to 'https://relayer.adex.network'
- ```AWIS_KEY``` - API key for the amazon alexa API.
- ```PORT``` - Port
- ```IPFSHOST``` - Host address for ipfs
- ```IPFSPORT``` - Port for ipfs
- ```IPFSPROTOCOL``` - Protocol for IPFS
- ```API_KEY``` - API key for infura
- ```REDIS_PORT``` - Port for redis
- ```REDIS_HOST``` - Host address for redis
- ```REDIS_PASSWD``` - Password for redis
- ```REDIS_SSL``` - SSL for redis
- ```REDIS_KEY``` - Filepath to redis key
- ```REDIS_CERT``` - Filepath to redis certificate
- ```REDIS_CA``` - Filepath to redis CA certificate
- ```TEST_MARKET_URL``` - Used for integration tests, URL of the server instance used for the tests
- ```CLUSTERED``` - Enables clustering, defaults to false
- ```MAX_WORKERS``` - Max amount of workers to run in clustered mode. Defaults to 0
## How to run

```
npm start
```


## Build a Docker image

```
docker build . --tag=adexnetwork/market
docker push adexnetwork/market
```

## Query parmeters
```GET /campaigns?limitForPublisher``` - Limits earnings for a specific publisher, used through the `adview-manager` currently. If query parameter is included, it will limit the amount of non-expired campaigns returned where the publisher has earnings (by looking up `campaign.status.lastApprovedBalances.[ADDR]`), to a limit specified in ```cfg.js```.
```GET /campaigns?limit=``` - Limits the number of results. Defaults to 500 currently.
```GET /campaigns?skip=``` - How many items to skip. Useful for pagination.
```GET /campaigns?status=``` - Only returns campaigns with specified statuses, seperated by comma. Defaults to Active and Ready
```GET /campaigns?all``` - Returns all camapigns regardless of status
```GET /campaigns?depositAsset=``` - Returns campaigns with a certain deposit asset which is the id of a token.
```GET /campaigns?byCreator=``` - Returns campaigns created by a certain address
```GET /campaigns?byEarner=``` - Returns campaigns which have a certain address in their balance tree.