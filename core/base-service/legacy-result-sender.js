'use strict'

const fs = require('fs')
const path = require('path')
const stream = require('stream')
const svg2img = require('../../gh-badges/lib/svg-to-img')
const log = require('../server/log')

const internalError = fs.readFileSync(
  path.resolve(__dirname, '..', 'server', 'error-pages', '500.html'),
  'utf-8'
)

function streamFromString(str) {
  const newStream = new stream.Readable()
  newStream._read = () => {
    newStream.push(str)
    newStream.push(null)
  }
  return newStream
}

function sendSVG(res, askres, end) {
  askres.setHeader('Content-Type', 'image/svg+xml;charset=utf-8')
  end(null, { template: streamFromString(res) })
}

function sendOther(format, res, askres, end) {
  askres.setHeader('Content-Type', `image/${format}`)
  svg2img(res, format)
    // This interacts with callback code and can't use async/await.
    // eslint-disable-next-line promise/prefer-await-to-then
    .then(data => {
      end(null, { template: streamFromString(data) })
    })
    .catch(err => {
      // This emits status code 200, though 500 would be preferable.
      log.error('svg2img error', err)
      end(internalError)
    })
}

function sendJSON(res, askres, end) {
  askres.setHeader('Content-Type', 'application/json')
  askres.setHeader('Access-Control-Allow-Origin', '*')
  end(null, { template: streamFromString(res) })
}

function makeSend(format, askres, end) {
  if (format === 'svg') {
    return res => sendSVG(res, askres, end)
  } else if (format === 'json') {
    return res => sendJSON(res, askres, end)
  } else {
    return res => sendOther(format, res, askres, end)
  }
}

module.exports = {
  makeSend,
}
