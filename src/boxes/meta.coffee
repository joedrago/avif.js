Box = require '../Box'

class MetaBox extends Box
  read: ->
    @readFullBoxHeader()
    @readChildren()
  write: ->
    @writeStart()
    @writeHeader()
    @writeFullBoxHeader()
    @writeChildren()
    @writeFinish()

module.exports = MetaBox
