const fetch = require('node-fetch')
const marketUrl = process.env.TEST_MARKET_URL

async function getTestSlots() {
	return fetch(`${marketUrl}/slots`)
		.then(res => res.json())
		.then(res => res)
}

async function getCampaigns() {
	return fetch(`${marketUrl}/campaigns`)
		.then(res => res.json())
		.then(res => res)
}

async function unitsForSlotTestOutput() {
	const testSlots = await getTestSlots()
	const slotIpfs = testSlots.slots[0].id
	getCampaigns()
	return fetch(`${marketUrl}/units-for-slot/${slotIpfs}`, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:83.0) Gecko/20100101 Firefox/83.0',
			'Cf-Ipcountry': 'BG',
		},
	})
		.then(res => res.json())
		.then(res => {
			console.log(JSON.stringify(res, null, 1))
			return res
		})
}

unitsForSlotTestOutput()
