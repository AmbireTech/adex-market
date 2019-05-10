/* eslint-disable indent */
const tape = require('tape')
const fetch = require('node-fetch')
const marketUrl = process.env.TEST_MARKET_URL
const fs = require('fs')
const testData = require('../prep-db/seedDb').testData
const FormData = require('form-data')

const identityAddr = '0x3F07d21bEDfB20Ad9aE797cE603cB4A3C7258e65'
const signerAddr = `0x2aecF52ABe359820c48986046959B4136AfDfbe2`
const earnerAddr = '0xd6e371526cdaeE04cd8AF225D42e37Bc14688D9E'

const addrRegex40 = /^0x[0-9A-Fa-f]{40}$/
const addrRegex64 = /^0x[0-9A-Fa-f]{64}$/
const addrRegex130 = /^0x[0-9A-Fa-f]{130}$/

const mockAuthObj = {
	identity: identityAddr,
	signerAddress: signerAddr,
	signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
	mode: 2,
	authToken: '7036680048500819',
	hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
	typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }]
}

const brokenAuthObj = {
	identity: '0xa624dEe05d96A0b3E441d0ee3b25Cc5CC0b5b836',
	signerAddress: signerAddr,
	signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
	mode: '1',
	authToken: '7036680048500819',
	hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
	typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }]
}

const mockAdUnit = 	{
	type: 'legacy_160x600',
	mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
	mediaMime: 'image/jpeg',
	targetUrl: 'https://google.com',
	created: Date.now(),
	title: 'Test ad unit',
	description: 'test ad unit for seeding db',
	tags: [{ tag: 'movies', score: 42 }, { tag: 'usa', score: 60 }]
}

const brokenAdUnit = {
	type: 'legacy_160x600',
	mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2tt', // Extra character here
	mediaMime: 'image/jpeg',
	targetUrl: 'https://google.com',
	created: Date.now(),
	title: 'Test ad unit',
	description: 'test ad unit for seeding db',
	tags: [{ tag: 'movies', score: 42 }, { tag: 'usa', score: 60 }]
}

const mockAdSlot = 	{
	type: 'legacy_250x250',
	tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
	created: Date.now(),
	fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
	fallbackTargetUrl: 'https://google.com',
	fallbackMediaMime: 'image/jpeg',
	title: 'Test slot 1',
	description: 'Test slot for running integration tests',
	archived: false,
	modified: Date.now()
}

const brokenAdSlot = {
	type: 'legacy_251x250',
	tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
	created: Date.now(),
	fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
	fallbackTargetUrl: 'https://google.com',
	fallbackMediaMime: 'image/jpeg',
	title: 'Test slot 1',
	description: 'Test slot for running integration tests',
	archived: false,
	modified: Date.now()
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
			t.ok(res[0].hasOwnProperty('lastApproved'))
			t.equals(typeof res[0].id, 'string', 'property id is of type string')
			t.equals(typeof res[0].status, 'object', 'property status is of type string')
			t.ok(res[0].status.hasOwnProperty('name'), 'campaign status has name property')
			t.equals(typeof res[0].depositAsset, 'string', 'property depositAsset is of type string')
			t.equals(typeof res[0].depositAmount, 'number', 'property depositAmount is of type number')
			t.ok(Array.isArray(res[0].validators), 'campaign validators is an array')
			t.equals(res[0].validators.length, 2, 'campaign has two validators')
			t.equals(typeof res[0].spec, 'object', 'property spec is of type object')
			t.equals(res[0].status.name, 'Active', 'first campaign is active')
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
			t.ok(addrRegex40.test(res[0].addr), 'First validator address is a real address')
			t.ok(addrRegex40.test(res[1].addr), 'Second validator address is a real address')
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
			t.equals(res[0].signerAddress, '0x2aecf52abe359820c48986046959b4136afdfbe2', 'correct address')
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
					t.ok(addrRegex40.test(res[0].signerAddress) && addrRegex40.test(res[1].signerAddress), 'Adress of users is real address')
					t.ok(addrRegex40.test(res[0].identity) && addrRegex40.test(res[1].identity), 'Identity of users is real address')
					t.ok(addrRegex130.test(res[0].signature) && addrRegex130.test(res[1].signature), 'Signature of users is real signature')
					t.ok(addrRegex64.test(res[0].hash) && addrRegex64.test(res[1].hash), 'Hash of users is correct')
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

tape('===== Authorized routes =====', (t) => {
	fetch(`${marketUrl}/auth`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(mockAuthObj)
	})
	.then(res => res.json())
	.then((authResult) => {
		const { status, identity, signature, expiryTime } = authResult
		t.equals(status, 'OK', 'authentication is successful')
		t.equals(typeof identity, 'string', 'Identity is a string')
		t.ok(addrRegex40.test(identity), 'Identity is a real identity')
		t.equals(typeof signature, 'string', 'Signature is a string')
		t.ok(addrRegex130.test(signature), 'Signature is a real signature')
		t.equals(typeof expiryTime, 'number', 'Expiry time is a number')

		const form = new FormData()
		form.append('media', fs.createReadStream(`${__dirname}/../resources/img.jpg`))

		const getAdSlots = fetch(`${marketUrl}/slots`, { headers: { 'x-user-signature': signature }, identity: identityAddr })
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 1, 'returns right amount of slots')
			t.ok(res[0].hasOwnProperty('type'), 'slot has property type')
			t.ok(res[0].hasOwnProperty('fallbackMediaUrl'), 'slot has property fallbackMediaUrl')
			t.ok(res[0].hasOwnProperty('fallbackTargetUrl'), 'slot has property fallbackTargetUrl')
			t.ok(res[0].hasOwnProperty('tags'), 'slot has property tags')
			t.ok(res[0].hasOwnProperty('owner'), 'slot has property owner')
			t.ok(Array.isArray(res[0].tags), 'slot has tags')
			t.equals(res[0].tags.length, 2, 'slot has right amount of tags')
			t.ok(addrRegex40.test(res[0].owner), 'Owner is a real address')
		})
		.catch(err => t.fail(err))

		const getAdUnits = fetch(`${marketUrl}/units`,
		{
			headers: {
				'x-user-signature': signature
			},
			identity: identityAddr
		})
		.then(res => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(res.length, 3, 'adunits are the right amount')
			t.ok(res[0].hasOwnProperty('type'), 'adUnit has property type')
			t.ok(res[0].hasOwnProperty('mediaUrl'), 'adUnit has property mediaUrl')
			t.ok(res[0].hasOwnProperty('targetUrl'), 'adUnit has property targetUrl')
			t.ok(res[0].hasOwnProperty('tags'), 'adUnit has property tags')
			t.ok(res[0].hasOwnProperty('owner'), 'adUnit has property owner')
			t.ok(addrRegex40.test(res[0].owner), 'Owner is a real address')
			t.equals(res[0].owner, identityAddr, 'unit has correct owner')
			t.ok(Array.isArray(res[0].tags))
			t.ok(res[0].tags.length, 'unit has tags')
		})
		.catch(err => t.fail(err))

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

		const postAdUnit = 	fetch(`${marketUrl}/units`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			identity: identityAddr,
			body: JSON.stringify(mockAdUnit)
		})
		.then(res => {
			t.comment('POST /units tests')
			t.equals(res.status, 200, 'adunit submitted successfully')
			return res.json()
		})
		.then((res) => {
			fetch(`${marketUrl}/units`,
				{
					headers: { 'x-user-signature': signature },
					identity: identityAddr
				})
				.then(getRes => getRes.json())
				.then((getRes) => {
					t.ok(Array.isArray(getRes), 'an array with slots is returned')
					t.equals(getRes.length, 4, 'new element is added') // 3 from test data + new one
				})
			fetch(`${marketUrl}/units/${res.ipfs}`, { headers: { 'x-user-signature': signature } })
				.then(getRes => getRes.json())
				.then((getRes) => {
					t.ok(Array.isArray(getRes), 'returns array')
					t.equals(getRes.length, 1, 'Only 1 ad unit is retrieved with get')
					t.equals(getRes[0].ipfs, res.ipfs, 'returns item with correct ipfs hash')
					fetch(`${marketUrl}/units/${res.ipfs}`, {
						method: 'PUT',
						headers: {
							'Content-type': 'application/json',
							'x-user-signature': signature
						},
						identity: identityAddr,
						body: JSON.stringify({
							title: 'Test slot 1',
							description: 'Test description for test slot 1',
							archived: true,
							modified: Date.now()
						})
					})
						.then((putRes) => {
							t.comment('PUT /units/:id tests')
							t.equals(putRes.status, 200, 'AdUnit edited successfully')
							return putRes.json()
						})
						.then((putRes) => {
							const updated = putRes.value
							t.equals(updated.ipfs, res.ipfs, 'Returned unit is the same')
							t.equals(updated.archived, true, 'Test unit archived successfully')
							t.ok(updated.modified, 'Modified is not null anymore')
						})
				})
		})

		const postBadAdUnit = fetch(`${marketUrl}/units`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			body: JSON.stringify(brokenAdUnit)
		})
		.then((res) => {
			t.comment('POST /units - bad data')
			t.equals(res.status, 500, 'not allowed to submit broken data')
		})

		const postAdSlot = 	fetch(`${marketUrl}/slots`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			identity: identityAddr,
			body: JSON.stringify(mockAdSlot)
		})
		.then(res => {
			t.comment('POST /slots')
			t.equals(res.status, 200, 'ad slot submitted successfully')
			return res.json()
		})
		.then((res) => {
			fetch(`${marketUrl}/slots`,
				{
					headers: { 'x-user-signature': signature },
					identity: identityAddr
				})
				.then(getRes => getRes.json())
				.then((getRes) => {
					t.ok(Array.isArray(getRes), 'an array is returned')
					t.equals(getRes.length, 2, 'new element is added')
				})
			fetch(`${marketUrl}/slots/${res.ipfs}`, { headers: { 'x-user-signature': signature } })
				.then(getRes => getRes.json())
				.then((getRes) => {
					t.ok(Array.isArray(getRes), 'returns array')
					t.equals(getRes.length, 1, 'returns 1 slot by ID')
					t.equals(getRes[0].ipfs, res.ipfs, 'slot ipfs hash is correct')
					t.equals(getRes[0].owner, identityAddr, 'owner is correct')
					fetch(`${marketUrl}/slots/${res.ipfs}`, {
						method: 'PUT',
						headers: {
							'Content-type': 'application/json',
							'x-user-signature': signature
						},
						identity: identityAddr,
						body: JSON.stringify({
							title: res.title,
							description: res.description,
							fallbackMediaUrl: res.fallbackMediaUrl,
							fallbackMediaMime: res.fallbackMediaMime,
							fallbackTargetUrl: res.fallbackTargetUrl,
							archived: true,
							modified: Date.now()
						})
					})
						.then((putRes) => {
							t.comment('PUT /slots/:id tests')
							t.equals(putRes.status, 200, 'AdSlot edited successfully')
							return putRes.json()
						})
						.then((putRes) => {
							const updated = putRes.value
							t.equals(updated.ipfs, res.ipfs, 'Returned slot is the same')
							t.equals(updated.archived, true, 'Test slot archived successfully')
							t.ok(updated.modified, 'Modified is not null anymore')
						})
				})
		})
		.catch((err) => console.error(err))

		const postBadAdSlot = fetch(`${marketUrl}/units`, {
			method: 'POST',
			headers: {
				'Content-type': 'application/json',
				'x-user-signature': signature
			},
			body: JSON.stringify(brokenAdSlot)
		})
		.then((res) => {
			t.comment('/POST adslots - bad data')
			t.equals(res.status, 500, 'broken adslots cant be submitted')
		})

		const getEarnerBalances = fetch(`${marketUrl}/campaigns/by-earner/${earnerAddr}`,
		{
			headers: {
				'x-user-signature': signature
			}
		})
		.then((res) => {
			t.comment('GET /campaigns/by-earner/:id')
			t.equals(res.status, 200, 'Balances retrieved successfully')
			return res.json()
		})
		.then((res) => {
			const balanceObj = res[0]
			t.ok(balanceObj.hasOwnProperty(earnerAddr), 'retrieved balances contain the user object')
			t.equals(typeof balanceObj[earnerAddr], 'number', 'balance is a number')
		})

		Promise.all([postMedia, postAdUnit, postBadAdUnit, postAdSlot, postBadAdSlot, getAdUnits, getAdSlots, getEarnerBalances])
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
		t.equals(res.status, 500, 'Error with authenticating')
		t.end()
	})
	.catch(err => t.fail(err))
})

// TODO test with all modes
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
		t.ok(addrRegex40.test(res.identity), 'Identity is a real identity')
		t.ok(addrRegex130.test(res.signature), 'Signature is a real signature')
		t.equals(res.identity, identityAddr, 'returns correct identity')
		t.equals(res.signature, mockAuthObj.signature, 'returns correct signature')
		t.ok(res.hasOwnProperty('expiryTime'), 'returned object has expiry time')
		t.equals(typeof res.expiryTime, 'number', 'expiry time is a number')
		t.end()
	})
	.catch(err => t.fail(err))
})
tape('POST /units unauthenticated', (t) => {
	const adUnit = testData.adUnits[0]

	fetch(`${marketUrl}/units`, {
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

tape('POST /units unauthenticated', (t) => {
	const adSlot = testData.adSlot

	fetch(`${marketUrl}/units`, {
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
