#/usr/bin/env node

MONGO_OUT=/dev/null # could be &1
TIMESTAMP=`date +%s`

MARKET_PORT=3013
RELAYER_PORT=1935
MONGO="testAdexMarket${TIMESTAMP}"
TEST_MARKET_URL="http://localhost:$MARKET_PORT"
RELAYER_HOST="http://goerli-relayer.adex.network"

# echo "Seeding database complete"

# running ipfs
ipfs daemon &
sleep 6

PORT=$MARKET_PORT DB_MONGO_NAME=$MONGO NODE_ENV="test" RELAYER_HOST=$RELAYER_HOST IPFSHOST="127.0.0.1" IPFSPORT="5001" IPFSPROTOCOL="http" npm start &
sleep 6

TEST_MARKET_URL=$TEST_MARKET_URL IDENTITY_ADDR=$IDENTITY_ADDR node ./test/integration/integration.js

exitCode=$?

# end all processes
pkill -P $$
# kill relayer instance
lsof -ti tcp:$RELAYER_PORT | xargs kill
# kill ipfs port
lsof -ti tcp:$IPFSPORT | xargs kill

if [ $exitCode -eq 0 ]; then
    echo "cleaning up DB"
    mongo $MONGO --eval 'db.dropDatabase()' >$MONGO_OUT
else
    echo -e "\033[0;31mTests failed: waiting 20s before cleaning the database (press ctrl-C to avoid cleanup)\033[0m"
    (
        sleep 20 &&
        mongo $MONGO --eval 'db.dropDatabase()' >$MONGO_OUT
    )
fi

exit $exitCode
