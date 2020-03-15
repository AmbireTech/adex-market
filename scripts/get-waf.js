const db = require('../db')

async function getWAF() {
	await db.connect()
	const publishers = (
		await db
			.getMongo()
			.collection('websites')
			.find({
				$or: [
					{ verifiedOwnership: true },
					{ verifiedIntegration: true },
					{ verifiedForce: true },
				],
			})
			.toArray()
	)
		.map(x => x.publisher)
		.sort()
		.filter((el, i, arr) => arr.indexOf(el) === i)

	if (!publishers.length) return ``

	const matchRule = `and not http.request.full_uri matches "/${publishers
		.map(x => x.slice(2, 12))
		.join('|')}/i"`
	return `(http.host eq "market.moonicorn.network" and http.request.full_uri contains "limitForPublisher=" ${matchRule})`
}

getWAF()
	.then(waf => {
		console.log(waf)
		process.exit(0)
	})
	.catch(console.error)
