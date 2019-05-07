/* eslint-disable no-undef */
const identityAddr = '0x3F07d21bEDfB20Ad9aE797cE603cB4A3C7258e65'

const testData = {
	campaign: {
		_id: 'testCampaign1',
		id: 'testCampaign1',
		status: { name: 'Active' },
		depositAsset: 'DAI',
		depositAmount: 1000,
		validators: ['awesomeLeader', 'awesomeFollower'],
		spec: {
			validators: [
				{ id: 'awesomeLeader', url: 'https://tom.adex.network', fee: 100 },
				{ id: 'awesomeFollower', url: 'https://jerry.adex.network', fee: 100 }
			]
		},
		lastApproved: {
			newState: {
				from: '0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
				msg: {
					type: 'NewState',
					balances: {
						'0xd6e371526cdaeE04cd8AF225D42e37Bc14688D9E': 75000000000000000
					},
					stateRoot: '371efd566b2d0ddbfa9bb421ad8de6185b19e7b4d1ee8d01edfd53b98c96c5fe',
					signature: '0xf7fd0bdd12ca4d711261be9659667ee7eaf14233fd2c0652f0836e8c15e0c65063a571896753efce0388f82b64060d519a72e5d50b7638ea7e18f0ee552fdeb71b'
				},
				received: '2019-04-25T14:02:01.741Z'
			},
			approveState: {
				from: '0xce07CbB7e054514D590a0262C93070D838bFBA2e',
				msg: {
					type: 'ApproveState',
					stateRoot: '371efd566b2d0ddbfa9bb421ad8de6185b19e7b4d1ee8d01edfd53b98c96c5fe',
					isHealthy: true,
					signature: '0xf67972edcf9719ad0f3460872875662690ea05931665eb5cc2159fe982e6dbe93a642db2a25b1d019c8be4f300fad97a2e51c3bdd88d90230442709abc55127c1c'
				},
				received: '2019-04-25T14:02:17.443Z'
			}
		}
	},
	validators: [
		{ _id: 'awesomeLeader', id: 'awesomeLeader', url: 'https://tom.adex.network', status: 'active', addr: '0x000000000000000078787874656e746163696f6e' },
		{ _id: 'awesomeFollower', id: 'awesomeFollower', url: 'https://jerry.adex.network', status: 'active', addr: '0x0000000000000000667265652036697839696e65' }
	],
	user: {
		identity: identityAddr,
		signerAddress: '0x2aecf52abe359820c48986046959b4136afdfbe2',
		signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
		mode: 2,
		authToken: '7036680048500819',
		hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
		typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }],
		role: 'advertiser'
	},
	adUnits: [
		{
			type: 'legacy_250x250',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			targeting: [{ tag: 'games', score: 100 }],
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
			owner: identityAddr
		},
		{
			type: 'legacy_160x600',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [{ tag: 'movies', score: 42 }, { tag: 'usa', score: 60 }],
			owner: identityAddr
		},
		{
			type: 'legacy_728x90',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			targeting: [{ tag: 'music', score: 100 }],
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [{ tag: 'music', score: 42 }, { tag: 'rap', score: 60 }],
			owner: identityAddr,
			archived: true
		}
	],
	adSlot: {
		type: 'legacy_250x250',
		tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
		owner: identityAddr,
		created: Date.now(),
		fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		fallbackTargetUrl: 'https://google.com',
		fallbackMediaMime: 'image/jpeg',
		ipfs: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		title: 'Test slot 1',
		description: 'Test slot for running integration tests',
		archived: false,
		modified: Date.now()
	}
}

function seedDb (db) {
	return Promise.all([
		db.collection('campaigns').insertOne(testData.campaign),
		db.collection('validators').insertMany(testData.validators),
		db.collection('users').insertOne(testData.user),
		db.collection('adUnits').insertMany(testData.adUnits),
		db.collection('adSlots').insertOne(testData.adSlot)
	])
}

module.exports = { testData, seedDb }
