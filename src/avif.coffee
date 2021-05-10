AVIFError = require './AVIFError'
Box = require './Box'
BoxFactory = require './BoxFactory'

CHUNK_SIZE = 1024 * 1024

class FileBox extends Box
  constructor: (avif, buffer) ->
    super(avif, "FILE", buffer, 0, buffer.length)
  read: ->
    @readChildren()

    # For convenience
    @boxes = {}
    for child in @children
      @boxes[child.type] = child

  write: ->
    @writeChildren()

class AVIF
  constructor: ->
    @factory = new BoxFactory()
    @root = null

  read: (buffer) ->
    @root = null
    root = new FileBox(this, buffer)
    try
      root.read()
    catch e
      return e
    @root = root
    return null

  write: ->
    if not @root?
      return null

    @w =
      buffer: Buffer.alloc(CHUNK_SIZE)
      offset: 0
      fixups: []

    @w.makeRoom = (size) =>
      if (@w.buffer.offset + size) > @w.buffer.size
        newSize = @w.buffer.size + CHUNK_SIZE
        newBuffer = Buffer.alloc(newSize)
        @w.buffer.copy(newBuffer)
        @w.buffer = newBuffer

    @w.writeHeader = (size, type) =>
      @w.writeU32(size + 8)
      @w.writeFourCC(type)

    @w.writeBytes = (buffer, start, size) =>
      @w.makeRoom(size)
      buffer.copy(@w.buffer, @w.offset, start, start + size)
      @w.offset += size

    @w.writeFourCC = (fourCC) =>
      @w.makeRoom(4)
      typeBuffer = Buffer.from(fourCC, "utf8")
      typeBuffer.copy(@w.buffer, @w.offset, 0, 4)
      @w.offset += 4

    @w.writeU8 = (v) =>
      @w.makeRoom(1)
      @w.buffer.writeUInt8(v, @w.offset)
      @w.offset += 1
    @w.writeU16 = (v) =>
      @w.makeRoom(2)
      @w.buffer.writeUInt16BE(v, @w.offset)
      @w.offset += 2
    @w.writeU32 = (v, fixupBaseOffset = null) =>
      @w.makeRoom(4)
      @w.buffer.writeUInt32BE(v, @w.offset)
      if fixupBaseOffset != null
        @w.addFixup(32, @w.offset, fixupBaseOffset, v)
      @w.offset += 4
    @w.writeU64 = (v, fixupBaseOffset = null) =>
      @w.makeRoom(8)
      @w.buffer.writeUInt64BE(v, @w.offset)
      if fixupBaseOffset != null
        @w.addFixup(64, @w.offset, fixupBaseOffset, v)
      @w.offset += 8

    @w.fixU32 = (v, offset) =>
      @w.buffer.writeUInt32BE(v, offset)

    @w.addFixup = (type, dstOffset, fixupBaseOffset, fixupOffset) =>
      @w.fixups.push {
        type: type
        dstOffset: dstOffset
        fixupBaseOffset: fixupBaseOffset
        fixupOffset: fixupOffset
      }

    @w.flushFixups = (box, delta) =>
      if delta != 0
        # console.log "Fixing up #{@w.fixups.length} spots due to an mdat shift of #{delta} bytes"
        for fixup in @w.fixups
          if fixup.fixupBaseOffset != 0
            throw new AVIFError("Unimplemented base offset in iloc fixups", box)
          # TODO: check for impossible deltas
          switch fixup.type
            when 32
              v = @w.buffer.readUInt32BE(fixup.dstOffset)
              @w.buffer.writeUInt32BE(v + delta, fixup.dstOffset)
            when 64
              v = @w.buffer.readUInt64BE(fixup.dstOffset)
              @w.buffer.writeUInt64BE(v + delta, fixup.dstOffset)
      @w.fixups = []
      return

    @root.write()
    finalBuffer = Buffer.alloc(@w.offset)
    @w.buffer.copy(finalBuffer, 0, 0, @w.offset)
    return finalBuffer

  dump: ->
    if not @root?
      return
    skipProps = (k, v) ->
      switch k
        when 'avif', 'stream'
          return undefined
        when 'children'
          if v.length == 0
            return undefined
      return v
    return JSON.stringify(@root.boxes, skipProps, 2)

module.exports = AVIF
