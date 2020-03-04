#/usr/bin/env node

MONGO_OUT=/dev/null # could be &1
TIMESTAMP=`date +%s`

PORT=3014
MONGO="benchmarkTest${TIMESTAMP}"
TEST_MARKET_URL="http://localhost:$PORT"

# echo "Seeding database complete"

PORT=$PORT DB_MONGO_NAME=$MONGO NODE_ENV="benchmark" npm start &
sleep 6

echo "Testing /campaigns?all"
loadtest -c 10 --rps 10000 -t 20 -k "$TEST_MARKET_URL/campaigns?all"
echo "Testing /campaigns  (will get only Active/~Ready)"
loadtest -c 10 --rps 10000 -t 20 -k "$TEST_MARKET_URL/campaigns"
echo "Testing getting a specific campaign"
loadtest -c 10 --rps 10000 -t 20 -k "$TEST_MARKET_URL/campaigns/0xceb6ab03139b98e0a22d4375ce658759b8729e21c783dea9d385d99f76527865"
echo "Testing /campaigns/limitForPublisher reached limit"
loadtest -c 10 --rps 10000 -t 20 -k "$TEST_MARKET_URL/campaigns?all&limitForPublisher=0x99d162298ffc4ecd949bf574c2959130c8d2d8f8"
echo "Testing /campaigns/limitForPublisher unreached limit"
loadtest -c 10 --rps 10000 -t 20 -k "$TEST_MARKET_URL/campaigns?all&limitForPublisher=0x712e40a78735af344f6ae3b79fa6952d698c3b37"


exitCode=$?

# end all processes
pkill -P $$

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
