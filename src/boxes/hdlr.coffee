Box = require '../Box'

class HandlerBox extends Box
  read: ->
    @readFullBoxHeader()
    predefined = @readU32()
    @handlerType = @readFourCC()
    for reservedIndex in [0...3]
      @readU32()
    @name = @readString()

module.exports = HandlerBox
