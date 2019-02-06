const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const util = require('util')
const moment = require('moment')

function isDateRecent (lastEvAggr) {
  const date = new Date(lastEvAggr)
  return moment().diff(date, new Date(Date.now())) <= cfg.recency
}

function reduceMessages (type, recent) {
  return (messages, m) => {
    if (m.type === type && (!recent || isDateRecent(m.lastEvAggr))) {
      messages.push(m)
    }
    return messages
  }
}

function containsMessages (type, recent) {
  return (m) => {
    return m.type === type && (!recent || isDateRecent(m.lastEvAggr))
  }
}

function getApproveStateMessage (arr, m) {
  if (m.type === 'ApproveState') {
    return m
  }
}

function isInitializing (messages) {
  return messages.some((m) => {
    return m.length === 0
  })
}

function isOffline (messages) {
  return messages.some((m) => {
    const heartbeatMessages = m.reduce(reduceMessages('Heartbeat', true), [])
    return heartbeatMessages.length === 0
  })
}

function isDisconnected (messages) {
  const heartbeatMessagesLeader = messages[0].reduce(reduceMessages('Heartbeat', false), [])
  const heartbeatMessagesFollower = messages[1].reduce(reduceMessages('Heartbeat', false), [])

  const totalMessages = heartbeatMessagesLeader.length
  let matchingMessages = 0

  heartbeatMessagesLeader.map((h1) => {
    const match = heartbeatMessagesFollower.some((h2) => {
      return util.isDeepStrictEqual(h1, h2)
    })
    if (match) matchingMessages++
  })

  return matchingMessages <= (totalMessages / 2)
}

function isInvalid (messages) {
  const recentNewStateLeader = messages[0].some(containsMessages('NewState', true))
  const recentNewStateFollower = messages[1].some(containsMessages('NewState', true))
  const followerPropagatesApproveState = messages[1].some(containsMessages('ApproveState', false))

  if (recentNewStateLeader && recentNewStateFollower && !followerPropagatesApproveState) {
    return true
  }
  return false
}

function isUnhealthy (messages) {
  const recentNewStateLeader = messages[0].some(containsMessages('NewState', true))
  const recentNewStateFollower = messages[1].some(containsMessages('NewState', true))
  const followerPropagatesApproveState = messages[1].some(containsMessages('ApproveState', false))

  if (recentNewStateLeader && recentNewStateFollower && followerPropagatesApproveState) {
    const approved = messages[1].reduce(getApproveStateMessage)

    if (!approved.isHealthy) {
      return true
    }
    return false
  }
}

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

function isActive (messages) {
  const recentHbLeader = messages[0].reduce(reduceMessages('Heartbeat', true), [])
  const recentHbFollower = messages[1].reduce(reduceMessages('Heartbeat', true), [])
  const recentNewStateLeader = messages[0].reduce(reduceMessages('NewState', true), [])
  const recentNewStateFollower = messages[1].reduce(reduceMessages('NewState', true), [])
  const approved = messages[1].reduce(getApproveStateMessage)
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

function isExhausted (campaign) {
// TODO
}

function isExpired (campaign) {
  return moment(new Date(Date.now())).isAfter(new Date(campaign.validUntil))
}

function getStatus (messages, campaign) {
  if (isExhausted(campaign)) {
    return 'Exhausted'
  } else if (isExpired(campaign)) {
    return 'Expired'
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

function getValidatorMessagesOfCampaign (campaign) {
  const validators = campaign.spec.validators

  const valResults = validators.map((v) => {
    return getRequest(`${v.url}/channel/${v.id}/validator-messages`)
      .then((result) => {
        return result.validatorMessages
      })
  })

  return Promise.all(valResults)
    .then((result) => {
      return getStatus(result, campaign)
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
            console.log('Status ===', status)
          })
      })
    })
}

module.exports = queryValidators
