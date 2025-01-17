#!/usr/bin/env node

const cmd = process.argv[1]
const op = process.argv[2]
if (!['discovery', 'swarm', 'dht'].includes(op)) {
  console.error(`Usage: ${cmd} [command] --help

  Commands:
  
    discovery ... Interact with the discovery network (DHT and MDNS)
    swarm ....... Use the discovery to make connections
    dht ......... Start a dht node

  Example:

    bitswarm discovery --help
`)
  process.exit(1)
}
const path = require('path')
const file = path.join(__dirname, `${op}.js`)

process.argv = [process.argv[0], `${cmd} ${op}`].concat(process.argv.slice(3))
require(file)
