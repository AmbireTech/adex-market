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

```npm start ``` - Starts server
```npm start-scraper``` - Starts scraper


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


## Publisher verification

Publisher verification is automatically performed upon ad slot creation (POST `/slot`) and is performed on a hostname basis. For example, if the website is `https://www.stremio.com/`, the hostname is `www.stremio.com`. The main purpose of the verification is to check **whether a publisher really owns the given website**. Subdomains need to be checked separately. Only HTTPS websites are supported.

When asking for slot details (GET `/slot`), we return `acceptedReferrers`, which is determined based on whether the website has been successfully verified.

We save each hostname to a collection called `websites` where each entry contains `hostname`, `publisher` (publisher address), a few Alexa-specific properties (`rank`, `reachPerMillion`) and a few verification-specific properties (`verifiedForce`, `verifiedIntegration`, `verifiedOwnership`).

Whether a record is considered valid is determined at query-time rather than when saving the record. This is done for two reasons: 1) to check for duplicates (whether another publisher verified the same hostname before you) and 2) so we can change what we consider to be "verified" at any point. For example, right now we accept either DNS TXT (ownership) verification or integration, but at some point we may only accept DNS TXT and we want to be able to change this quickly without migrating the DB.

If many records with the same hostname exist (but for a different publisher), only one is considered valid: the oldest one that is passing verification.

DNS TXT ownership verification (`verifiedOwnership`) works by checking a DNS TXT record that contains the publisher address. It will consider a root domain record to be valid for a subdomain.

For more details on how verification is done, see `lib/publisherVerification`.


### Scripts

There are a few scripts to moderate publisher verification:

`./scripts/verify-publisher.js publisherAddr websiteUrl [--force|--blacklist]`: trigger verification of a publisher or update their verification; `--force` will make it verified regardless of whether the automated checks pass, and `--blacklist` will blacklist it

`./scripts/update-verifications.js`: updates all existing verification records by re-running the check; also blacklists in a "contagious" manner: if one verification record is blacklisted, all other records with the same hostname will be too; should be ran every 24 hours

There's also `unverified-adslots.js`, but this is no longer relevant.
