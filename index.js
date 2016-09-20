'use strict'

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_APP_SECRET=your_app_secret FB_PAGE_TOKEN=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

var bodyParser = require('body-parser')
var crypto = require('crypto')
var express = require('express')
var fetch = require('node-fetch')
var request = require('request')

var Wit = null
var log = null
try {
  // if running from repo
  Wit = require('../').Wit
  log = require('../').log
} catch (e) {
  Wit = require('node-wit').Wit
  log = require('node-wit').log
}

// Webserver parameter
var PORT = process.env.PORT || 8445

// Wit.ai parameters
var WIT_TOKEN = process.env.WIT_TOKEN

// Messenger API parameters
var FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN
if (!FB_PAGE_TOKEN) {
  throw new Error('missing FB_PAGE_TOKEN')
}
var FB_APP_SECRET = process.env.FB_APP_SECRET
if (!FB_APP_SECRET) {
  throw new Error('missing FB_APP_SECRET')
}

var FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

var fbMessage = function fbMessage (id, text) {
  var body = JSON.stringify({
    recipient: { id: id },
    message: { text: text }
  })
  var qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN)
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  body: body }).then(function (rsp) {
    return rsp.json()
  }).then(function (json) {
    if (json.error && json.error.message) {
      throw new Error(json.error.message)
    }
    return json
  })
}

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
var sessions = {}

var findOrCreateSession = function findOrCreateSession (fbid) {
  var sessionId = void 0
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(function (k) {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k
    }
  })
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString()
    sessions[sessionId] = { fbid: fbid, context: {} }
  }
  return sessionId
}

// Our bot actions
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return fbMessage(recipientId, text)
        .then(() => null)
        .catch((err) => {
          console.error(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err.stack || err
          )
        })
    } else {
      console.error("Oops! Couldn't find user for session:", sessionId)
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },

  getVouchers({context, entities}) {
    return new Promise(function (resolve, reject) {
      // Here should go the api call, e.g.:
      // context.forecast = apiCall(context.loc)
      context.theDeals = 'Get 10% Off With XYZ'
      return resolve(context)
    })
  },


  pickGreeting({context, entities}) {
  return new Promise(function (resolve, reject) {
    var greetings = [
    'Hi',
    'Alright?',
    'Hey There',
    'Sup?',
    'Hello!'
    ]
    var randomNumber = Math.floor(Math.random()*textArray.length);
      context.greeting = greetings[randomNumber];
      return resolve(context)
  }

}

// Setting up our bot
var wit = new Wit({
  accessToken: WIT_TOKEN,
  actions: actions,
  logger: new log.Logger(log.INFO)
})

// Starting our webserver and putting it all together
var app = express()
app.use(function (_ref, rsp, next) {
  var method = _ref.method
  var url = _ref.url

  rsp.on('finish', function () {
    console.log(rsp.statusCode + ' ' + method + ' ' + url)
  })
  next()
})
app.use(bodyParser.json({ verify: verifyRequestSignature }))

// Webhook setup
app.get('/webhook', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
  } else {
    res.sendStatus(400)
  }
})

// Message handler
app.post('/webhook', function (req, res) {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  var data = req.body

  if (data.object === 'page') {
    data.entry.forEach(function (entry) {
      entry.messaging.forEach(function (event) {
        if (event.message && !event.message.is_echo) {
          (function () {
            // Yay! We got a new message!
            // We retrieve the Facebook user ID of the sender
            var sender = event.sender.id

            // We retrieve the user's current session, or create one if it doesn't exist
            // This is needed for our bot to figure out the conversation history
            var sessionId = findOrCreateSession(sender)

            // We retrieve the message content
            var _event$message = event.message
            var text = _event$message.text
            var attachments = _event$message.attachments

            if (attachments) {
              // We received an attachment
              // Let's reply with an automatic message
              fbMessage(sender, 'Sorry I can only process text messages for now.').catch(console.error)
            } else if (text) {
              // We received a text message

              // Let's forward the message to the Wit.ai Bot Engine
              // This will run all actions until our bot has nothing left to do
              wit.runActions(sessionId, // the user's current session
                text, // the user's message
                sessions[sessionId].context // the user's current session state
              ).then(function (context) {
                // Our bot did everything it has to do.
                // Now it's waiting for further messages to proceed.
                console.log('Waiting for next user messages')

                // Based on the session state, you might want to reset the session.
                // This depends heavily on the business logic of your bot.
                // Example:
                // if (context['done']) {
                //   delete sessions[sessionId]
                // }

                // Updating the user's current session state
                sessions[sessionId].context = context
              }).catch(function (err) {
                console.error('Oops! Got an error from Wit: ', err.stack || err)
              })
            }
          })()
        } else {
          console.log('received event', JSON.stringify(event))
        }
      })
    })
  }
  res.sendStatus(200)
})

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature (req, res, buf) {
  var signature = req.headers['x-hub-signature']

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.")
  } else {
    var elements = signature.split('=')
    var method = elements[0]
    var signatureHash = elements[1]

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET).update(buf).digest('hex')

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.")
    }
  }
}

app.listen(PORT)
console.log('Listening on :' + PORT + '...')
