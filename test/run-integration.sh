#/usr/bin/env node

MONGO_OUT=/dev/null # could be &1
echo $PWD
TIMESTAMP=`date +%s`

PORT=3013
MONGO="testAdexMarket${TIMESTAMP}"
TEST_MARKET_URL="http://localhost:$PORT"

# # Seeding the database
# echo "Using MongoDB database names: $MONGO"
# mongo $MONGO ./test/prep-db/testData.js >$MONGO_OUT &
# sleep 3

# echo "Seeding database complete"

PORT=$PORT DB_MONGO_NAME=$MONGO ENVIRONMENT="test" npm start &
sleep 10

TEST_MARKET_URL=$TEST_MARKET_URL node ./test/integration/integration.js

exitCode=$?

# end all processes
pkill -P $$

if [ $exitCode -eq 0 ]; then
    echo "cleaning up DB"
    mongo $MONGO --eval 'db.dropDatabase()' >$MONGO_OUT
else
    echo -e "\033[0;31mTests failed: waiting 20s before cleaning the database (press ctrl-C to avoid cleanup)\033[0m"
    echo "MongoDB database name: $MONGO"
    (
        sleep 20 &&
        mongo $MONGO --eval 'db.dropDatabase()' >$MONGO_OUT
    )
fi

exit $exitCode
