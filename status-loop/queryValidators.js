const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const util = require('util')
const moment = require('moment')

function isDateRecent (timestamp) {
  const date = new Date(timestamp)
  return moment().diff(date, new Date(Date.now())) <= cfg.recency
}

function reduceMessages (type, recent) {
  return (messages, m) => {
    const timestamp = m.lastEvAggr || m.timestamp
    if (m.type === type && (!recent || isDateRecent(timestamp))) {
      messages.push(m)
    }
    return messages
  }
}

function containsMessages (type, recent) {
  return (m) => {
    const timestamp = m.lastEvAggr || m.timestamp
    return m.type === type && (!recent || isDateRecent(timestamp))
  }
}

function getApproveStateMessage (message) {
  return message.type === 'ApproveState'
}

// there are no messages at all for at least one validator
function isInitializing (messages) {
  return messages.some((m) => {
    return m.length === 0
  })
}

// at least one validator doesn't have a recent Heartbeat message
function isOffline (messages) {
  return messages.some((m) => {
    return m.reduce(reduceMessages('Heartbeat', true), []).length === 0
  })
}

// validators have recent Heartbeat messages, but they don't seem to be propagating messages between one another (the majority of Heartbeats are not found on both validators)
function isDisconnected (messages) {
  const heartbeatMessagesLeader = messages[0].reduce(reduceMessages('Heartbeat', false), [])
  const heartbeatMessagesFollower = messages[1].reduce(reduceMessages('Heartbeat', false), [])

  const totalMessages = heartbeatMessagesLeader.length

  let matchingMessages = heartbeatMessagesLeader.filter((h1) => {
    const match = heartbeatMessagesFollower.some((h2) => {
      return util.isDeepStrictEqual(h1, h2)
    })
    return match
  }).length

  return matchingMessages <= (totalMessages / 2)
}

// there are recent NewState messages, but the follower does not issue or propagate ApproveState
function isInvalid (messages) {
  const recentNewStateLeader = messages[0].some(containsMessages('NewState', true))
  const recentNewStateFollower = messages[1].some(containsMessages('NewState', true))
  const followerPropagatesApproveState = messages[1].some(containsMessages('ApproveState', false))

  if (recentNewStateLeader && recentNewStateFollower && !followerPropagatesApproveState) {
    return true
  }
  return false
}

// there are recent NewState and ApproveState, but the ApproveState reports unhealthy
function isUnhealthy (messages) {
  const recentNewStateLeader = messages[0].some(containsMessages('NewState', true))
  const recentNewStateFollower = messages[1].some(containsMessages('NewState', true))
  const followerPropagatesApproveState = messages[1].some(containsMessages('ApproveState', false))

  if (recentNewStateLeader && recentNewStateFollower && followerPropagatesApproveState) {
    const approved = messages[1].filter(getApproveStateMessage)

    return !approved.isHealthy
  }
}

// both validators have a recent Heartbeat but a NewState has never been emitted
function isReady (messages) {
  const recentHbLeader = messages[0].reduce(reduceMessages('Heartbeat', true), [])
  const recentHbFollower = messages[1].reduce(reduceMessages('Heartbeat', true), [])
  const newStateLeader = messages[0].some(containsMessages('NewState', false))
  const newStateFollower = messages[1].some(containsMessages('NewState', false))

  if (recentHbLeader && recentHbFollower && !newStateLeader && !newStateFollower) {
    return true
  }
  return false
}

// there are recent NewState, ApproveState and Heartbeat's, and the ApproveState reports healthy
function isActive (messages) {
  const recentHbLeader = messages[0].reduce(reduceMessages('Heartbeat', true), [])
  const recentHbFollower = messages[1].reduce(reduceMessages('Heartbeat', true), [])
  const recentNewStateLeader = messages[0].reduce(reduceMessages('NewState', true), [])
  const recentNewStateFollower = messages[1].reduce(reduceMessages('NewState', true), [])
  const approved = messages[1].filter(getApproveStateMessage)
  const isHealthy = approved ? approved.isHealthy : false

  if (recentHbLeader.length > 0 &&
      recentHbFollower.length > 0 &&
      recentNewStateLeader.length > 0 &&
      recentNewStateFollower.length > 0 &&
      isHealthy) {
    return true
  }
  return false
}

// all of the funds in the channel have been distributed
function isExhausted (campaign, balanceTree) {
  const totalBalances = Object.keys(balanceTree).reduce((total, current) => total + current, 0)
  return totalBalances >= campaign.depositAmount
}

// the channel is expired
function isExpired (campaign) {
  return moment(new Date(Date.now())).isAfter(new Date(campaign.validUntil))
}

function getStatus (messages, campaign, balanceTree) {
  if (isExpired(campaign)) {
    return 'Expired'
  } else if (isExhausted(campaign, balanceTree)) {
    return 'Exhausted'
  } else if (isInitializing(messages)) {
    return 'Initializing'
  } else if (isOffline(messages)) {
    return 'Offline'
  } else if (isDisconnected(messages)) {
    return 'Disconnected'
  } else if (isInvalid(messages)) {
    return 'Invalid'
  } else if (isUnhealthy(messages)) {
    return 'Unhealthy'
  } else if (isReady(messages)) {
    return 'Ready'
  } else if (isActive(messages)) {
    return 'Active'
  } else {
    return 'No status detected'
  }
}

function updateStatus (campaign, status) {
  const campaignCol = db.getMongo().collection('campaigns')

  return campaignCol.findOneAndUpdate(
    { _id: campaign._id },
    { $set:
      { status: status }
    })
}

function getValidatorMessagesOfCampaign (campaign) {
  const validators = campaign.spec.validators

  const leaderPromise = getRequest(`${validators[0].url}/channel/${validators[0].id}/validator-messages`)
  const followerPromise = getRequest(`${validators[1].url}/channel/${validators[1].id}/validator-messages`)
  const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/tree`)

  return Promise.all([leaderPromise, followerPromise, treePromise])
    .then((result) => {
      const messages = [result[0].validatorMessages, result[1].validatorMessages]
      const balanceTree = result[2].balances
      return getStatus(messages, campaign, balanceTree)
    })
}

function queryValidators () {
  db.getMongo().collection('campaigns')
    .find()
    .toArray()
    .then((campaigns) => {
      campaigns.map((c) => {
        getValidatorMessagesOfCampaign(c)
          .then((status) => {
            const statusObj = { name: status, lastChecked: new Date().toISOString() }
            return updateStatus(c, statusObj)
          })
      })
    })
}

module.exports = queryValidators
