#/usr/bin/env node

MONGO_OUT=/dev/null # could be &1
TIMESTAMP=`date +%s`

PORT=3013
MONGO="testAdexMarket${TIMESTAMP}"
TEST_MARKET_URL="http://localhost:$PORT"
RELAYER_HOST="http://goerli-relayer.adex.network"

# echo "Seeding database complete"


# running relayer
if [ -n "${RELAYER_PATH}" ]
then
    echo "Starting relayer..."
    __dir=$PWD
    cd $RELAYER_PATH
    PORT=1935 npm run start &
    cd $__dir
    RELAYER_PATH=$RELAYER_PATH "${__dir}/adex-market/test/start-relayer.sh"
    RELAYER_HOST="http://localhost:${PORT}"
    sleep 10
else
    echo "No RELAYER_PATH variable provided. Running goerli relayer"
fi


PORT=$PORT DB_MONGO_NAME=$MONGO NODE_ENV="test" RELAYER_HOST=$RELAYER_HOST npm start &
sleep 6

TEST_MARKET_URL=$TEST_MARKET_URL node ./test/integration/integration.js

exitCode=$?

# end all processes
pkill -P $$
# kill relayer instance
lsof -ti tcp:$PORT | xargs kill

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
