#/usr/bin/env bash

MONGO_OUT=/dev/null # could be &1
echo $PWD
TIMESTAMP=`date +%s`

PORT=3013
MONGO="testAdexMarket${TIMESTAMP}"

# Seeding the database
echo "Using MongoDB database names: $MONGO"
mongo $MONGO ./test/prep-db/mongo.js >$MONGO_OUT

PORT=$PORT DB_MONGO_NAME=$MONGO ./index.js

./test/integration/integration.js

exitCode=$?

# end all jobs (sentries, workers)
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
