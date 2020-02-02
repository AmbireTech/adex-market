/* eslint-disable no-undef */
const { AdSlot, AdUnit } = require('adex-models')
const identityAddr = '0x3F07d21bEDfB20Ad9aE797cE603cB4A3C7258e65'
const identityAddrFilter = '0x3F07d21bEDfB20Ad9aE797cE603cB4A3C7258666'
const cfg = require('../../cfg')

const activeCampaignData = {
	status: {
		name: 'Active',
		lastHeartbeat: {
			leader: new Date(Date.now()).toISOString(),
			follower: new Date(Date.now()).toISOString(),
		},
		lastApprovedBalances: {},
	},
}
activeCampaignData.status.lastApprovedBalances[identityAddr] =
	'1000000000000000000'
const activeCampaignDataOtherId = {
	status: {
		name: 'Active',
		lastHeartbeat: {
			leader: new Date(Date.now()).toISOString(),
			follower: new Date(Date.now()).toISOString(),
		},
		lastApprovedBalances: {
			'0x0000000000000000000000000000000000000001': '1000000000000000000',
		},
	},
}

const campaignLimitDataNoFiltering = [
	getCampaign(activeCampaignData),
	getCampaign(activeCampaignData),
	getCampaign(activeCampaignDataOtherId),
	getCampaign({
		status: {
			name: 'Expired',
			lastApprovedBalances: {
				[identityAddr]: '1000000000000000000',
			},
		},
	}),
]

const campaignsAboveLimit = []

for (let i = 1; i <= cfg.maxChannelsEarningFrom + 10; i++) {
	const campaignData = {
		status: {
			name: 'Active',
			lastHeartbeat: {
				leader: new Date(Date.now()).toISOString(),
				follower: new Date(Date.now()).toISOString(),
			},
			lastApprovedBalances: {},
		},
	}

	campaignData.status.lastApprovedBalances[identityAddrFilter] =
		i + '000000000000000000' // will gradually increase with 1 DAI
	const campaign = getCampaign(campaignData)
	campaignsAboveLimit.push(campaign)
}

const testData = {
	campaigns: [...campaignLimitDataNoFiltering, ...campaignsAboveLimit],
	validators: [
		{
			_id: 'awesomeLeader',
			id: 'awesomeLeader',
			url: 'https://tom.adex.network',
			status: 'active',
			addr: '0x000000000000000078787874656e746163696f6e',
		},
		{
			_id: 'awesomeFollower',
			id: 'awesomeFollower',
			url: 'https://jerry.adex.network',
			status: 'active',
			addr: '0x0000000000000000667265652036697839696e65',
		},
	],
	user: {
		identity: identityAddr,
		signerAddress: '0x2aecf52abe359820c48986046959b4136afdfbe2',
		signature:
			'0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
		mode: 2,
		authToken: '7036680048500819',
		hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
		typedData: [
			{ type: 'uint', name: 'Auth token', value: '7036680048500819' },
		],
		role: 'advertiser',
	},
	adUnits: [
		new AdUnit({
			type: 'legacy_250x250',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			targeting: [{ tag: 'games', score: 100 }],
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [
				{ tag: 'games', score: 42 },
				{ tag: 'usa', score: 60 },
			],
			owner: identityAddr,
		}),
		new AdUnit({
			type: 'legacy_160x600',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [
				{ tag: 'movies', score: 42 },
				{ tag: 'usa', score: 60 },
			],
			owner: identityAddr,
		}),
		new AdUnit({
			type: 'legacy_728x90',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			targeting: [{ tag: 'music', score: 100 }],
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [
				{ tag: 'music', score: 42 },
				{ tag: 'rap', score: 60 },
			],
			owner: identityAddr,
			archived: true,
		}),
	],
	adSlot: new AdSlot({
		type: 'legacy_250x250',
		tags: [
			{ tag: 'games', score: 42 },
			{ tag: 'usa', score: 60 },
		],
		owner: identityAddr,
		created: Date.now(),
		fallbackUnit: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		ipfs: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		title: 'Test slot 1',
		description: 'Test slot for running integration tests',
		archived: false,
		modified: Date.now(),
	}),
}

function seedDb(db) {
	return Promise.all([
		db.collection('campaigns').insertMany(testData.campaigns),
		db.collection('validators').insertMany(testData.validators),
		db.collection('users').insertOne(testData.user),
		db.collection('adUnits').insertMany(testData.adUnits),
		db.collection('adSlots').insertOne(testData.adSlot),
	])
}

function getCampaign(options) {
	return {
		creator: options.creator || '0x712e40a78735af344f6ae3b79fa6952d698c3b37',
		depositAmount: options.depositAmount || '100000000000000000000',
		depositAsset:
			options.depositAsset || '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D',
		id:
			options.id ||
			'0x443db27d965a4efc0c39ffa7ec2fa33d4ab113e1c2ac81cad6883a1efe23cec3',
		spec: {
			adUnits: (options.spec && options.spec.adUnits) || [
				{
					ipfs: 'QmTCnHWZQ22r43f2LqiuXHnK5EEiqHDKnxcdbg6NHaGjty',
					type: 'legacy_300x100',
					mediaUrl: 'ipfs://QmcHfBsBagg6BYhiLBW6qLQyCsVyd78RBAkhsVG1be6n4e',
					mediaMime: 'image/jpeg',
					targetUrl: 'https://hellostremio.adex.network/',
					targeting: [
						{
							tag: 'stremio',
							score: 22,
						},
					],
					owner: '0x712e40a78735af344f6ae3b79fa6952d698c3b37',
					created: 1558351066790,
				},
			],
			validators: (options.spec && options.spec.validators) || [
				{
					id: '0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
					url: 'https://itchy.adex.network',
					fee: '0',
				},
				{
					id: '0xce07CbB7e054514D590a0262C93070D838bFBA2e',
					url: 'https://scratchy.adex.network',
					fee: '0',
				},
			],
			maxPerImpression:
				(options.spec && options.spec.maxPerImpression) || '1000000000000000',
			minPerImpression:
				(options.spec && options.spec.minPerImpression) || '1000000000000000',
			targeting: (options.spec && options.spec.targeting) || [],
			created: (options.spec && options.spec.created) || 1558351283397,
			nonce:
				(options.spec && options.spec.nonce) ||
				'73925552938438451124360388946703653167557904034069293949858925105243906956203',
			withdrawPeriodStart:
				(options.spec && options.spec.withdrawPeriodStart) || 1558437660000,
			eventSubmission: {
				allow: [
					{
						uids: [
							'0x712e40a78735af344f6ae3b79fa6952d698c3b37',
							'0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
							'0xce07CbB7e054514D590a0262C93070D838bFBA2e',
						],
					},
					{
						uids: null,
						rateLimit: {
							type: 'ip',
							timeframe: 15000,
						},
					},
				],
			},
			activeFrom: (options.spec && options.spec.activeFrom) || 1558351262283,
		},
		validUntil: options.validUntil || 1559042460,
		status: {
			name: (options.status && options.status.name) || 'Expired',
			lastHeartbeat: (options.status && options.status.lastHeartbeat) || {
				leader: '2019-05-28T11:20:05.710Z',
				follower: '2019-05-28T11:20:26.653Z',
			},
			lastApprovedSigs: (options.status && options.status.lastApprovedSigs) || [
				'0xe1ebfc9e1918096ce2b3306f287442baf2ba6ad296b035ba8c59fd19aa095a3c7c58e8eb29737405570cedc8d7cb36a6626000a165356b6e0580bb6cde0d92201c',
				'0x95af2c6037e17dcfe1b8996d887ae09a0303412d937c91a9db52b86d529406a266ec4e4d1b46478202f10321b162953fece9f79cc12748f9c80deba936d76c1c1c',
			],
			lastApprovedBalances: (options.status &&
				options.status.lastApprovedBalances) || {
				'0x712e40a78735af344f6ae3b79fa6952d698c3b37': '1000000000000000000',
			},
			verified: (options.status && options.status.verified) || true,
			lastChecked:
				(options.status && options.status.lastChecked) || 1562143408103,
			fundsDistributedRatio:
				(options.status && options.fundsDistributedRatio) || 1000,
			usdEstimate: (options.status && options.usdEstimate) || null,
		},
	}
}
module.exports = { testData, seedDb, getCampaign }
