/* eslint-disable indent */
const tape = require('tape')
const fetch = require('node-fetch')
const marketUrl = process.env.TEST_MARKET_URL
const fs = require('fs')
const testData = require('../prep-db/seedDb').testData
const FormData = require('form-data')

// TODO export those and other repetitive data into integrationTestsConstants module
const mockAuthObj = {
	identity: '0x27e47D714fe59a13C008341Fc83588876b747c60',
	address: '0x2aecf52abe359820c48986046959b4136afdfbe2',
	signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
	mode: 1,
	authToken: '7036680048500819',
	hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
	typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }]
}

const brokenAuthObj = {
	identity: '0xa624dEe05d96A0b3E441d0ee3b25Cc5CC0b5b836',
	address: '0x2aecf52abe359820c48986046959b4136afdfbe2',
	signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
	mode: '1',
	authToken: '7036680048500819',
	hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
	typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }]
}

const mockAdUnit = 	{
	type: 'legacy_728x90',
	mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb25',
	targetUrl: 'https://google.com',
	tags: [{ tag: 'music', score: 70 }, { tag: 'rap', score: 100 }],
	owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
}

const brokenAdUnit = {
	type: 'legacy_728x91',
	mediaUrl: 'ipsfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb25',
	targetUrl: 'htttps://google.com',
	tags: [{ tag: 'music', score: 70 }, { tag: 'rap', score: 100 }],
	owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
}

const mockAdSlot = 	{
	type: 'legacy_728x90',
	fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
	fallbackTargetUrl: 'https://google.com',
	tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
	owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
}

const brokenAdSlot = {
	type: 'legacy_251x250',
	fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
	fallbackTargetUrl: 'https://google.com',
	tags: 'h4x0r',
	owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
}

tape('GET /campaigns', (t) => {
	fetch(`${marketUrl}/campaigns`)
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 1, 'returns right amount of campaigns')
			t.ok(res[0].hasOwnProperty('id'), 'campaign has property id')
			t.ok(res[0].hasOwnProperty('status'), 'campaign has property status')
			t.ok(res[0].hasOwnProperty('depositAsset'), 'campaign has property depositAsset')
			t.ok(res[0].hasOwnProperty('depositAmount'), 'campaign has property depositAmount')
			t.ok(res[0].hasOwnProperty('validators'), 'campaign has property validators')
			t.ok(res[0].hasOwnProperty('spec'), 'campaign has property spec')
			t.equals(typeof res[0].id, 'string', 'property id is of type string')
			t.equals(typeof res[0].status, 'string', 'property status is of type string')
			t.equals(typeof res[0].depositAsset, 'string', 'property depositAsset is of type string')
			t.equals(typeof res[0].depositAmount, 'number', 'property depositAmount is of type number')
			t.ok(Array.isArray(res[0].validators), 'campaign validators is an array')
			t.equals(res[0].validators.length, 2, 'campaign has two validators')
			t.equals(typeof res[0].spec, 'object', 'property spec is of type object')
			t.equals(res[0].status, 'Active', 'first campaign is active')
			t.end()
		})
		.catch(err => t.fail(err))
})

tape('GET /campaigns/:id', (t) => {
	fetch(`${marketUrl}/campaigns/testCampaign1`)
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array with the element')
			t.equals(res.length, 1, 'only one campaign is returned')

			// LeaderBalanceTree: **exists**
			// Test: /\_/|
			//     Ϟ(๑ﾟoﾟ)Ϟ
			t.ok(res[0].hasOwnProperty('leaderBalanceTree'), 'Returns leaderBalanceTree')

			t.ok(res[0].hasOwnProperty('followerBalanceTree'), 'Returns followerBalanceTree')
			t.end()
		})
		.catch(err => t.fail(err))
})

tape('GET /validators', (t) => {
	fetch(`${marketUrl}/validators`)
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 2, 'two validators are returned')
			t.ok(res[0].hasOwnProperty('id'), 'validator has property id ')
			t.ok(res[0].hasOwnProperty('url'), 'validator has property url ')
			t.ok(res[0].hasOwnProperty('status'), 'validator has property status ')
			t.ok(res[0].hasOwnProperty('addr'), 'validator has property addr ')
			t.equals(typeof res[0].id, 'string', 'property id is of type string ')
			t.equals(typeof res[0].url, 'string', 'property url is of type string ')
			t.equals(typeof res[0].status, 'string', 'property status is of type string ')
			t.equals(typeof res[0].addr, 'string', 'property addr is of type string ')
			t.equals(res[0].status, 'active', 'first validator is loaded and active')
			t.equals(res[1].status, 'active', 'second validator is loaded and active')
			t.end()
		})
		.catch(err => t.fail(err))
})

tape('GET /validators?status=status', (t) => {
	fetch(`${marketUrl}/validators?status=active`)
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 2, 'two validators are returned')
			t.equals(res[0].status, 'active', 'first validator is loaded and active')
			t.equals(res[1].status, 'active', 'second validator is loaded and active')
			t.end()
		})
		.catch(err => t.fail(err))
})

tape('GET /validators?addr=addr', (t) => {
	fetch(`${marketUrl}/validators?addr=0x000000000000000078787874656e746163696f6e`)
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 1, 'only one validator is returned')
			t.equals(res[0].id, 'awesomeLeader', 'validator with correct id is returned')
			t.equals(res[0].status, 'active', 'returned validator is of right status')
			t.end()
		})
		.catch(err => t.fail(err))
})

tape('GET /user/list', (t) => {
	fetch(`${marketUrl}/users/list`)
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 1, 'correct number of users')
			t.ok(res[0].hasOwnProperty('identity'), 'user has identity address')
			t.equals(res[0].address, '0x2aecf52abe359820c48986046959b4136afdfbe2', 'correct address')
			t.end()
		})
		.catch(err => t.fail(err))
})

// TODO test user list with ?hasinteracted

tape('GET /stats', (t) => {
	fetch(`${marketUrl}/stats`)
		.then(res => res.json())
		.then((res) => {
			t.ok(res.hasOwnProperty('publisherCount'), 'stats has publisherCount')
			t.ok(res.hasOwnProperty('advertiserCount', 'stats has advertiserCount'))
			t.ok(res.hasOwnProperty('anonPublisherCount', 'stats has anonPublisherCount'))
			t.ok(res.hasOwnProperty('anonAdvertiserCount'), 'stats has anonAdvertiserCount')
			t.ok(res.hasOwnProperty('campaignCount'), 'stats has campaignCount property')
			t.ok(res.hasOwnProperty('campaignsByStatus'), 'stats has property campaignsByStatus')
			t.ok(res.hasOwnProperty('totalSpentFundsByAssetType'), 'stats has totalSpentFundsByAssetType')
			t.equals(typeof res.publisherCount, 'number', 'publisherCount is of correct type')
			t.equals(typeof res.advertiserCount, 'number', 'advertiserCount is of correct type')
			t.equals(typeof res.anonPublisherCount, 'number', 'anonPublisherCount is of right type')
			t.equals(typeof res.anonAdvertiserCount, 'number', 'anonAdvertiserCount is the right type')
			t.equals(typeof res.campaignCount, 'number', 'campaignCount is of right type')
			t.equals(typeof res.campaignsByStatus, 'object', 'campaignsByStatus is of right type')
			t.equals(typeof res.totalSpentFundsByAssetType, 'object', 'totalSpentFundsByAssetType is of right type')
			t.equals(res.publisherCount, 0, 'publisherCount is the right amount')
			t.equals(res.advertiserCount, 1, 'advertiserCount is the right amount')
			t.equals(res.anonPublisherCount, 0, 'anonPublisherCount is right amount')
			t.equals(res.anonAdvertiserCount, 0, 'anonAdvertiserCount is of right amount')
			t.equals(res.campaignCount, 1, 'campaignCount is of right amount')
			t.equals(res.campaignsByStatus['Active'], 1, 'active status campaigns are the right amount')
			t.equals(res.totalSpentFundsByAssetType['DAI'], 1000, 'funds are the right amount')
			t.end()
		})
		.catch(err => t.fail(err))
})

tape('POST /users', (t) => {
	fetch(`${marketUrl}/users`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(testData.user)
	})
		.then(res => res.json())
		.then((res) => {
			t.equals(res.success, true, 'user is added successfully')
			fetch(`${marketUrl}/users/list`)
				.then(res => res.json())
				.then((res) => {
					t.ok(Array.isArray(res), 'returns array')
					t.equals(res.length, 2, '2 users, the previous one + the recently added one')
					t.ok(res.some(obj => obj.identity === testData.user.identity && obj.signature === testData.user.signature), 'the new object has been added')
					t.end()
				})
		})
		.catch(err => t.fail(err))
})

tape('POST /media unauthorized', (t) => {
	fetch(`${marketUrl}/media`, {
		method: 'POST'
	})
	.then((res) => {
		t.equals(res.status, 403, 'Unauthorized to post')
		t.end()
	})
	.catch(err => t.fail(err))
})

tape('POST on authorized routes', (t) => {
	fetch(`${marketUrl}/auth`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(mockAuthObj)
	})
	.then(res => res.json())
	.then((authResult) => {
		const { signature } = authResult

		const form = new FormData()
		form.append('media', fs.createReadStream(`${__dirname}/../resources/img.jpg`))

		const postMedia = fetch(`${marketUrl}/media`, {
			method: 'POST',
			headers: {
				'x-user-signature': signature
			},
			body: form
		})
		.then(res => res.json())
		.then((res) => {
			t.comment('POST on /media')
			t.equals(typeof res, 'object', 'Something is returned')
			t.ok(res.hasOwnProperty('ipfs'), 'Returns something called ipfs')
			t.equals(typeof res.ipfs, 'string', 'IPFS is a string')
		})

		const postAdUnit = 	fetch(`${marketUrl}/adunits`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			identity: '0x27e47D714fe59a13C008341Fc83588876b747c60',
			body: JSON.stringify(mockAdUnit)
		})
		.then((res) => {
			t.comment('POST /adunits tests')
			t.equals(res.status, 200, 'adunit submitted successfully')
			fetch(`${marketUrl}/adunits`,
				{
					headers: { 'x-user-signature': signature },
					identity: '0x27e47D714fe59a13C008341Fc83588876b747c60'
				})
				.then(res => res.json())
				.then((res) => {
					t.ok(Array.isArray(res), 'an array is returned')
					t.equals(res.length, 4, 'new element is added') // 3 from test data + new one
				})
		})

		const postBadAdUnit = fetch(`${marketUrl}/adunits`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			body: JSON.stringify(brokenAdUnit)
		})
		.then((res) => {
			t.comment('POST /adunits - bad data')
			t.equals(res.status, 403, 'not allowed to submit broken data')
		})

		const postAdSlot = 	fetch(`${marketUrl}/adslots`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			identity: '0x27e47D714fe59a13C008341Fc83588876b747c60',
			body: JSON.stringify(mockAdSlot)
		})
		.then((res) => {
			t.comment('POST /adslots')
			t.equals(res.status, 200, 'submitted successfully')
			fetch(`${marketUrl}/adslots`,
				{
					headers: { 'x-user-signature': signature },
					identity: '0x27e47D714fe59a13C008341Fc83588876b747c60'
				})
				.then(res => res.json())
				.then((res) => {
					t.ok(Array.isArray(res), 'an array is returned')
					t.equals(res.length, 2, 'new element is added')
				})
		})

		const postBadAdSlot = fetch(`${marketUrl}/adslots`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			body: JSON.stringify(brokenAdSlot)
		})
		.then((res) => {
			t.comment('/POST adslots - bad data')
			t.equals(res.status, 403, 'broken adslots cant be submitted')
		})

		const getAdUnits = fetch(`${marketUrl}/adunits`,
			{
				headers: {
					'x-user-signature': signature
				},
				identity: '0x27e47D714fe59a13C008341Fc83588876b747c60'
			})
			.then(res => res.json())
			.then((res) => {
				t.ok(Array.isArray(res), 'returns array')
				t.equals(res.length, 4, 'adunits are the right amount') // 3 from test data + posted one
				t.ok(res[0].hasOwnProperty('type'), 'adUnit has property type')
				t.ok(res[0].hasOwnProperty('mediaUrl'), 'adUnit has property mediaUrl')
				t.ok(res[0].hasOwnProperty('targetUrl'), 'adUnit has property targetUrl')
				t.ok(res[0].hasOwnProperty('tags'), 'adUnit has property tags')
				t.ok(res[0].hasOwnProperty('owner'), 'adUnit has property owner')
				t.equals(res[0].owner, '0x27e47D714fe59a13C008341Fc83588876b747c60', 'unit has correct owner')
				t.ok(Array.isArray(res[0].tags))
				t.ok(res[0].tags.length, 'unit has tags')
			})
			.catch(err => t.fail(err))
		// TODO retrieve ID of posted unit/slot so we can target it with the commented out routes
		// const getAdUnitsById = fetch(`${marketUrl}/adunits/(...)`, { headers: { 'x-user-signature': signature } })
		// 	.then(res => res.json())
		// 	.then((res) => {
		// 		t.ok(Array.isArray(res), 'returns array')
		// 		t.equals(res.length, 1, 'Only 1 ad unit is retrieved with get')
		// 		t.equals(res[0].mediaUrl, 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 'returns item with correct ipfs hash')
		// 	})
		// 	.catch(err => t.fail(err))

		const getAdSlots = fetch(`${marketUrl}/adslots`, { headers: { 'x-user-signature': signature }, identity: '0x27e47D714fe59a13C008341Fc83588876b747c60' })
			.then(res => res.json())
			.then((res) => {
				t.ok(Array.isArray(res), 'returns array')
				t.equals(res.length, 2, 'returns right amount of slots') // 1 by default + posted one
				t.ok(res[0].hasOwnProperty('type'), 'slot has property type')
				t.ok(res[0].hasOwnProperty('fallbackMediaUrl'), 'slot has property fallbackMediaUrl')
				t.ok(res[0].hasOwnProperty('fallbackTargetUrl'), 'slot has property fallbackTargetUrl')
				t.ok(res[0].hasOwnProperty('tags'), 'slot has property tags')
				t.ok(res[0].hasOwnProperty('owner'), 'slot has property owner')
				t.ok(Array.isArray(res[0].tags), 'slot has tags')
				t.equals(res[0].tags.length, 2, 'slot has right amount of tags')
			})
			.catch(err => t.fail(err))

		// const getAdSlotsById = fetch(`${marketUrl}/adslots/(...)`, { headers: { 'x-user-signature': signature } })
		// 	.then(res => res.json())
		// 	.then((res) => {
		// 		t.ok(Array.isArray(res), 'returns array')
		// 		t.equals(res.length, 1, 'returns 1 slot by ID')
		// 		t.equals(res[0].fallbackMediaUrl, 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 'slot address is correct')
		// 		t.equals(res[0].owner, '0x27e47D714fe59a13C008341Fc83588876b747c60', 'owner is correct')
		// 		t.end()
		// 	})
		// 	.catch(err => t.fail(err))

		Promise.all([postMedia, postAdUnit, postBadAdUnit, postAdSlot, postBadAdSlot, getAdUnits, getAdSlots])
			.then(() => {
				t.end()
			})
			.catch(err => t.fail(err))
	})
	.catch(err => t.fail(err))
})

tape('POST /auth with bad data', (t) => {
	fetch(`${marketUrl}/auth`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(brokenAuthObj)
	})
	.then((res) => {
		t.equals(res.status, 400, 'Error with authenticating')
		t.end()
	})
	.catch(err => t.fail(err))
})

tape('POST /auth with correct data', (t) => {
	fetch(`${marketUrl}/auth`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(mockAuthObj)
	})
	.then(res => res.json())
	.then((res) => {
		t.equals(res.status, 'OK', 'Request was successful')
		t.equals(res.identity, mockAuthObj.identity, 'returns correct identity')
		t.equals(res.signature, mockAuthObj.signature, 'returns correct signature')
		t.ok(res.hasOwnProperty('expiryTime'), 'returned object has expiry time')
		t.equals(typeof res.expiryTime, 'number', 'expiry time is a number')
		t.end()
	})
	.catch(err => t.fail(err))
})
// TODO test with all modes when fixed

tape('POST /adunits unauthenticated', (t) => {
	const adUnit = testData.adUnits[0]

	fetch(`${marketUrl}/adunits`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(adUnit)
	})
	.then((res) => {
		t.equals(res.status, 403, 'Can\'t post unit when not authenticated')
		t.end()
	})
	.catch(err => t.fail(err))
})

tape('POST /adslots unauthenticated', (t) => {
	const adSlot = testData.adSlot

	fetch(`${marketUrl}/adslots`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(adSlot)
	})
	.then((res) => {
		t.equals(res.status, 403, 'Cannot post adslot when not authenticated')
		t.end()
	})
	.catch(err => t.fail(err))
})