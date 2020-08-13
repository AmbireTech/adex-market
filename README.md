# adex-market

The market is a RESTful service maintained and hosted by AdEx Network OÜ.

The primary role of the market is to facilitate demand/supply discovery and trading. It keeps record of all campaigns that are currently valid, and allows publishers/advertisers to query that list in order to find what they need.

The market needs to track all on-chain OUTPACE channels and needs to constantly monitor their liveness (>=2/3 validators online and producing new states) and state.

Additional privacy can be achieved by having groups of publishers/advertisers run their own instances of the market - that way, campaigns will be visible only within their private group.

For more information, see [adex-protocol](https://github.com/adexnetwork/adex-protocol)

## ENVIRONMENT
- ```DB_MONGO_NAME``` - Name of database to use in MongoDB
- ```DB_MONGO_URL``` - URL for Mongo
- ```DB_MONGO_USE_TLS``` - Flag showing wether mongo should use TLS certificate for connections
- ```DB_MONGO_CA``` - Path to the SSL CA certificate
- ```DB_MONGO_CERT``` - Path to SSL certificate
- ```DB_MONGO_KEY``` - Path to SSL public key
- ```DB_MONGO_REPLSET``` - Flag, shows wether we will use a replica set or not
- ```PORT``` - Port
- ```IPFSHOST``` - Host address for ipfs
- ```IPFSPORT``` - Port for ipfs
- ```IPFSPROTOCOL``` - Protocol for IPFS
- ```NODE_ENV``` - Environment for node, currently `production`, `test` and `benchmark`
- ```API_KEY``` - API key for infura
- ```REDIS_PORT``` - Port for redis
- ```REDIS_HOST``` - Host address for redis
- ```REDIS_PASSWD``` - Password for redis
- ```REDIS_SSL``` - Flag, shows wether redis should use SSL certificate or not
- ```REDIS_KEY``` - Path to SSL public key for redis
- ```REDIS_CERT``` - Path to SSL certificate for redis
- ```REDIS_CA``` - Path to SSL CA certificate for redis
- ```TEST_MARKET_URL``` - Used for integration tests, URL of the server instance used for the tests
- ```CLUSTERED``` - Enables clustering, defaults to false
- ```MAX_WORKERS``` - Limit of service workers when in clustered mode
- ```RELAYER_HOST``` - Hostname of relayer that will be used
- ```DATASET_NAME``` - Name of dataset in big query
- ```GOOGLE_CLOUD_PROJECT``` - Name of google cloud big query project
- ```AWIS_KEY``` - API key for Alexa Web Information Service
- ```WEBSHRINKER_KEY_AND_SECRET```  - Key and secret for webshrinker
- ```ADEX_MARKET_URL```  - URL of current market instance (used in `bigquery.js`)
- ```TOKEN_DECIMALS```  - Decimals for token used (used in `bigquery.js`)
- ```GOOGLE_APPLICATION_CREDENTIALS``` - Credentials for google cloud project
## How to run

```
npm start
```

## How to run tests
#### Unit tests:
```
npm test
```

#### Integration tests:
```
npm run test-integration
```
You can also make the integration tests execute using a local relayer by passing an environment variable with the path to a relayer like this:
```
RELAYER_PATH="../adex-relayer" npm run test-integration
```
If you use a local instance of the relayer, the default identity address used for the authroized routes might be invalid. Therefore you will have to provide one with an environment variable:
```
IDENTITY_ADDR="0x..."
```

## Build a Docker image

```
docker build . --tag=adexnetwork/market
docker push adexnetwork/market
```

## Query parmeters
```GET /campaigns?limitForPublisher``` - Limits earnings for a specific publisher, used through the `adview-manager` currently. If query parameter is included, it will limit the amount of non-expired campaigns returned where the publisher has earnings (by looking up `campaign.status.lastApprovedBalances.[ADDR]`), to a limit specified in ```cfg.js```.


## Publisher verification and categorization

Publisher verification and categorization is automatically performed upon ad slot creation (POST `/slot`) and is performed on a hostname basis. For example, if the website is `https://www.stremio.com/`, the hostname is `www.stremio.com`. The main purpose of the verification is to check **whether a publisher really owns the given website**. Subdomains need to be checked separately. Only HTTPS websites are supported.

When asking for slot details (GET `/slots`), we return `acceptedReferrers`, which is determined based on whether the website has been successfully verified.

We save each hostname to a collection called `websites` where each entry contains `hostname`, `publisher` (publisher address), a few Alexa-specific properties (`rank`, `reachPerMillion`) and a few verification-specific properties (`verifiedForce`, `verifiedIntegration`, `verifiedOwnership`).

Whether a record is considered valid is determined at query-time rather than when saving the record. This is done for two reasons: 1) to check for duplicates (whether another publisher verified the same hostname before you) and 2) so we can change the policy of what we consider to be "verified" at any point. For example, right now we accept either DNS TXT (ownership) verification or `.well-known/adex.txt` (`verifiedOwnership`) or manual verification (`verifiedForce`), but in the past we used to accept `verifiedIntegration` too.

If many records with the same hostname exist (but for a different publisher), only one is considered valid: the oldest one that is passing verification.

Ownership verification (`verifiedOwnership`) works by checking a DNS TXT record or a file in [`.well-known`](https://tools.ietf.org/html/rfc8615) that contains the publisher address. It will consider a root domain record to be valid for a subdomain, but not vice versa.

For more details on how verification is done, see `lib/publisherVerification`.

### Ownership verification

To prove you're the owner of a domain, you can either:

* add a DNS TXT record with the content `adex-publisher=replace-with-your-publisher-address`, for example `adex-publisher=0xd5860D6196A4900bf46617cEf088ee6E6b61C9d6`; the record name can either be the hostname (e.g. for `https://www.stremio.com`, this is `www.`) or the root hostname itself (stremio.com)
* place a `.well-known/adex.txt` file in the root directory that contains the same string


### Categorization

Categorization is currently (May 2020) performed by querying [Webshrinker](https://www.webshrinker.com/) and storing the results, which use the [IAB category taxonomy](https://www.iab.com/guidelines/iab-quality-assurance-guidelines-qag-taxonomy/).

We allow manual overrides through the `websites` collection, by setting `webshrinkerCategoriesOverrides` to an object of this shape: `{ incentivized: Boolean, add: [String], remove: [String] }`.

The current policy of determining the `categories` of an ad slot (as returned from `/slots`) is: start with the response from webshrinker, then add `IAB25-7` if the `incentivized` flag is set, then add all the `add` overrides and finally remove all the `remove` overrides and deduplicate. This is defined in `getCategories` in `lib/publisherVerification`.

The `incentivized` boolean is automatically set by the `update-verifications` script by using `detectExtraFlags`, and cannot be automatically unset. It can only be unset manually, but then the system may flag the website as incentivized again. If we want to permanently dissociate a website from this category, we can use `'webshrinkerCategoriesOverrides.remove': ['IAB25-7']`.

### Contagious blacklisting

Contagious blacklisting is an automatic process: if one verification record is blacklisted, all other records with the same hostname will eventually get auto-blacklisted as well.

Please note, it is not contagious on account basis: meaning that an account may have one blacklisted hostname, but still keep using their other hostnames.

This is implemented in the `update-verifications.js` script.

### Scripts

There are a few scripts to moderate publisher verification:

`./scripts/verify-publisher.js publisherAddr websiteUrl [--force|--blacklist]`: trigger verification of a publisher or update their verification; `--force` will make it verified regardless of whether the automated checks pass, and `--blacklist` will blacklist it

`./scripts/update-verifications.js`: updates all existing verification records by re-running the check; also blacklists in a "contagious" manner: if one verification record is blacklisted, all other records with the same hostname will be too; should be ran every 24 hours

There's also `unverified-adslots.js`, but this is no longer relevant.


### Design notes

The `websites` MongoDB collection contains all of the data that we have on a particular website. It gets updated periodically via `update-verifications`.

This collection is intended to contain "raw data", which is then aggregated and prepared upon requests (e.g. GET `/slots/`). This means that, for example, category information is extracted from a few separate fields (currently `webshrinkerCategories`, `webshrinkerCategoriesOverrides``), and whether a website gets determined based on multiple records/fields. The reasons for the latter are covered in detail in "Publisher verification and categorization".

However, the more general reasons are:

- To allow easy changes of policy without having to modify every record in the database
- To avoid having to do "housekeeping" tasks, e.g. if we use a field `categories` rather than computing them query-time, we'll have to update it every time we set some override in `webshrinkerCategoriesOverrides`


### "Catch all" campaigns

This is not directly related to verification, but it plays an important role in how traffic is moderated.

For a publisher to appear in the platform list of publishers, they need to have received a significant number of impressions. But without appearing there, they can't receive any number of impressions - so it's essentially a chicken-and-egg problem.

To solve this, we have to ensure there are always "catch all" campaigns - those are campaigns with no targeting set, in other words: all criteria is set to "All".
