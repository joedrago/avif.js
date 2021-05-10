Box = require '../Box'

class MediaDataBox extends Box
  write: ->
    oldOffset = @stream.offset - 8
    newOffset = @writeOffset()
    delta = newOffset - oldOffset
    super()
    @avif.w.flushFixups(this, delta)

module.exports = MediaDataBox
