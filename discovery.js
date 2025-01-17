#!/usr/bin/env node

const discovery = require('@web4/discovery')
const sodium = require('sodium-native')
const minimist = require('minimist')
const estimate = require('dht-size-up')

const argv = minimist(process.argv, {
  boolean: [
    'ephemeral',
    'ping',
    'hash'
  ],
  default: {
    ephemeral: true
  },
  alias: {
    'find-node': 'f',
    ephemeral: 'e',
    announce: 'a',
    unannounce: 'u',
    lookup: 'l',
    port: 'p',
    hash: 'h',
    bootstrap: 'b'
  }
})

if (!argv.ping && !argv.announce && !argv.unannounce && !argv.lookup && !argv['find-node'] && !argv['estimate-dht-size']) {
  console.error(`Usage: ${process.argv[1]} [options]

  --announce, -a     [key]
  --unannounce, -u   [key]
  --lookup, -l       [key]
  --port, -p         [port]  Specify port to announce
  --local-port               Specify local port
  --hash, -h                 Autohash the key
  --no-ephemeral             Host other peoples keys/values
  --bootstrap, -b            Specify bootstrap peers
  --estimate-dht-size        Estimate number of nodes in DHT
`)
  process.exit(1)
}

const d = discovery({
  ephemeral: argv.ephemeral,
  bootstrap: argv.boostrap ? [].concat(argv.bootstrap || []) : undefined
})

const localPort = argv['local-port'] || argv.port || 0

if (argv['find-node']) {
  const k = argv['find-node'] !== true ? Buffer.from(argv['find-node'], 'hex') : Buffer.alloc(32)
  console.log('Looking for ' + k.toString('hex'))
  const t = Date.now()
  d.dht.query('_find_node', k)
    .on('data', function (data) {
      if (data.node.id) console.log('Found: ' + data.node.id.toString('hex') + ' ' + data.node.host + ':' + data.node.port + ' (' + (Date.now() - t) + 'ms)')
    })
    .on('end', function () {
      if (!argv.announce && !argv.lookup) process.exit()
    })
}

if (argv.ping) {
  d.ping(function (_, nodes) {
    console.error('[pong]')
    console.log(nodes)
    if (!argv.announce && !argv.lookup) process.exit()
  })
}

if (argv.announce) {
  console.error('[announcing key]')
  const topic = d.announce(key(), { port: argv.port || 0, localPort })
    .on('peer', function (peer) {
      if (argv.lookup) console.log(peer)
    })

  process.once('SIGINT', function () {
    console.error('[unannouncing key ...]')
    topic.once('close', () => process.exit())
    topic.destroy()
  })
} else if (argv.lookup) {
  d.lookup(key())
    .on('peer', function (peer) {
      console.log(peer)
    })
}

if (argv['estimate-dht-size']) {
  estimate(d.dht, function (err, size, n, q) {
    if (err) console.error(err)
    else console.log(`Sampled ${n} nodes over ${q} queries. Estimated DHT size is ${size}.`)
  })
}

function key () {
  const k = argv.key || argv.announce || argv.unannounce || argv.lookup
  if (argv.hash) return hash(Buffer.from(k))
  return Buffer.from(k, 'hex')
}

function hash (data) {
  const out = Buffer.allocUnsafe(32)
  sodium.crypto_generichash(out, data)
  return out
}
