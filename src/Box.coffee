AVIFError = require './AVIFError'

class Box
  constructor: (@avif, @type, buffer, start, @size) ->
    @stream =
      buffer: buffer
      start: start
      offset: start
      bytesLeft: @size
    @version = undefined
    @flags = undefined
    @children = []

  # Overridden by derived classes
  read: ->
  write: ->
    @writeHeader()
    @writeContent()

  writeHeader: ->
    @avif.w.writeHeader(@size, @type)
  writeContent: ->
    @avif.w.writeBytes(@stream.buffer, @stream.start, @size)

  writeStart: ->
    @stream.writeStart = @writeOffset()
  writeFinish: ->
    boxSize = @writeOffset() - @stream.writeStart
    @avif.w.fixU32(boxSize, @stream.writeStart)

  writeOffset: ->
    return @avif.w.offset

  writeFullBoxHeader: ->
    if (@version == null) or (@flags == null)
      throw new AVIFError("Attempting to write a FullBox header on a Box that isn't a FullBox", this)
    versionAndFlags = (@version << 24) & @flags
    @avif.w.writeU32(versionAndFlags)
    return

  writeU8: (v) ->
    @avif.w.writeU8(v)
  writeU16: (v) ->
    @avif.w.writeU16(v)
  writeU32: (v, fixupBaseOffset = null) ->
    @avif.w.writeU32(v, fixupBaseOffset)
  writeU64: (v, fixupBaseOffset = null) ->
    @avif.w.writeU64(v, fixupBaseOffset)

  writeFourCC: (fourCC) ->
    @avif.w.writeFourCC(fourCC)

  writeChildren: ->
    for child in @children
      child.write()
    return

  nextBox: ->
    if @stream.bytesLeft == 0
      # None left; not an error
      return null
    if @stream.bytesLeft < 8
      throw new AVIFError("Not enough bytes left to read another box", this)
    boxSize = @stream.buffer.readUInt32BE(@stream.offset)
    boxType = @stream.buffer.toString('utf8', @stream.offset + 4, @stream.offset + 8)
    if boxSize > @stream.bytesLeft
      throw new AVIFError("Truncated box of type #{boxType} (#{boxSize} bytes with only #{@stream.bytesLeft} bytes left)", this)
    if boxSize < 8
      throw new AVIFError("Bad box size of type #{boxType} (#{boxSize} bytes", this)
    newBox = @avif.factory.create(@avif, this, boxType, @stream.buffer, @stream.offset + 8, boxSize - 8)
    @stream.offset += boxSize
    @stream.bytesLeft -= boxSize

    newBox.read()
    return newBox

  readChildren: ->
    while box = @nextBox()
      @children.push box
    return

  readFullBoxHeader: ->
    if @stream.bytesLeft < 4
      throw new AVIFError("Truncated FullBox of type #{boxType} (only #{@stream.bytesLeft} bytes left)", this)
    versionAndFlags = @stream.buffer.readUInt32BE(@stream.offset)
    @version = (versionAndFlags >> 24) & 0xFF
    @flags = versionAndFlags & 0xFFFFFF
    @stream.offset += 4
    @stream.bytesLeft -= 4
    return

  readU8: ->
    if @stream.bytesLeft < 1
      throw new AVIFError("Truncated read of U8 from box of type #{boxType} (only #{@stream.bytesLeft} bytes left)", this)
    ret = @stream.buffer.readUInt8(@stream.offset)
    @stream.offset += 1
    @stream.bytesLeft -= 1
    return ret

  readU16: ->
    if @stream.bytesLeft < 2
      throw new AVIFError("Truncated read of U16 from box of type #{boxType} (only #{@stream.bytesLeft} bytes left)", this)
    ret = @stream.buffer.readUInt16BE(@stream.offset)
    @stream.offset += 2
    @stream.bytesLeft -= 2
    return ret

  readU32: ->
    if @stream.bytesLeft < 4
      throw new AVIFError("Truncated read of U32 from box of type #{boxType} (only #{@stream.bytesLeft} bytes left)", this)
    ret = @stream.buffer.readUInt32BE(@stream.offset)
    @stream.offset += 4
    @stream.bytesLeft -= 4
    return ret

  readU64: ->
    if @stream.bytesLeft < 4
      throw new AVIFError("Truncated read of U64 from box of type #{boxType} (only #{@stream.bytesLeft} bytes left)", this)
    ret = @stream.buffer.readUInt64BE(@stream.offset)
    @stream.offset += 4
    @stream.bytesLeft -= 4
    return ret

  readFourCC: ->
    if @stream.bytesLeft < 4
      throw new AVIFError("Truncated read of FourCC from box of type #{boxType} (only #{@stream.bytesLeft} bytes left)", this)
    ret = @stream.buffer.toString('utf8', @stream.offset, @stream.offset + 4)
    @stream.offset += 4
    @stream.bytesLeft -= 4
    return ret

  readString: ->
    # find null terminator
    nullOffset = @stream.offset
    bytesLeft = @stream.bytesLeft
    while bytesLeft > 0
      byte = @stream.buffer.readUInt8(nullOffset)
      if byte == 0
        break
      nullOffset += 1
      bytesLeft -= 1
    if bytesLeft == 0
      throw new AVIFError("Truncated read of string from box of type #{boxType} (no null terminator found with #{@stream.bytesLeft} bytes left)", this)

    stringLength = nullOffset - @stream.offset
    ret = @stream.buffer.toString('utf8', @stream.offset, nullOffset)
    @stream.offset = nullOffset + 1
    @stream.bytesLeft -= stringLength + 1
    return ret

module.exports = Box
