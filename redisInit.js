const redis = require('redis')
const fs = require('fs')

const dbPort = process.env.REDIS_PORT || 15900
const dbHost = process.env.REDIS_HOST || 'redis-15900.c12.us-east-1-4.ec2.cloud.redislabs.com'
const dbPassword = process.env.REDIS_PASSWD
const dbUseSSL = process.env.REDIS_SSL || false
const dbKeyFile = process.env.REDIS_KEY || ''
const dbCertFile = process.env.REDIS_CERT || ''
const dbCaFile = process.env.REDIS_CA || ''
const encoding = 'ascii'

let redisClient = {}
if (dbUseSSL) {
	const ssl = {
		servername: dbHost,
		port: dbPort,
		key: fs.readFileSync(dbKeyFile, encoding),
		cert: fs.readFileSync(dbCertFile, encoding),
		ca: [ fs.readFileSync(dbCaFile, encoding) ]
	}
	redisClient = redis.createClient(dbPort, dbHost, { tls: ssl })
} else {
	redisClient = redis.createClient(dbPort, dbHost)
}

if (dbPassword) redisClient.auth(dbPassword, function (err) {
	if (err) throw err
})

console.log('Redis Database server is on ' + dbHost + ', port ' + dbPort)

redisClient.on('ready', function () {
	console.log('Redis is ready')
})

redisClient.on('error', function (err) {
	console.error('Error connecting to Redis: ' + err)
	process.exit(1)
})

module.exports = redisClient
