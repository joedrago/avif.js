Box = require '../Box'

class PrimaryItemBox extends Box
  read: ->
    @readFullBoxHeader()
    if @version == 0
      @id = @readU16()
    else
      @id = @readU32()

module.exports = PrimaryItemBox
