AVIFError = require '../AVIFError'
Box = require '../Box'

class ItemLocationBox extends Box
  read: ->
    @readFullBoxHeader()

    offsetAndLength = @readU8()
    @offsetSize = offsetAndLength >> 4
    @lengthSize = offsetAndLength & 0xF

    baseOffsetSizeAndIndexSize = @readU8()
    @baseOffsetSize = baseOffsetSizeAndIndexSize >> 4
    if (@version == 1) or (@version == 2)
      @indexSize = baseOffsetSizeAndIndexSize & 0xF
    else
      @indexSize = 0

    if @version < 2
      itemCount = @readU16()
    else if @version == 2
      itemCount = @readU32()
    else
      throw new AVIFError("unsupported iloc version #{version}", this)

    @items = []
    for itemIndex in [0...itemCount]
      if @version < 2
        id = @readU16()
      else if @version == 2
        id = @readU32()
      else
        throw new AVIFError("unsupported iloc version #{version}", this)

      item =
        id: id
        extents: []
      @items.push item

      if (@version == 1) or (@version == 2)
        item.constructionMethod = @readU16() & 0xF
      else
        item.constructionMethod = 0

      item.dataReferenceIndex = @readU16()
      switch @baseOffsetSize
        when 0
          item.baseOffset = 0
        when 4
          item.baseOffset = @readU32()
        when 8
          item.baseOffset = @readU64()
        else
          throw new AVIFError("unsupported iloc baseOffsetSize #{@baseOffsetSize}", this)

      extentCount = @readU16()
      for extentIndex in [0...extentCount]
        extent =
          index: 0
          offset: 0
          length: 0
        item.extents.push extent
        if (@version == 1) or (@version == 2)
          switch @indexSize
            when 0
              extent.index = 0
            when 4
              extent.index = @readU32()
            when 8
              extent.index = @readU64()
            else
              throw new AVIFError("unsupported iloc indexSize #{@indexSize}", this)
        switch @offsetSize
          when 0
            extent.offset = 0
          when 4
            extent.offset = @readU32()
          when 8
            extent.offset = @readU64()
          else
            throw new AVIFError("unsupported iloc offsetSize #{@offsetSize}", this)
        switch @lengthSize
          when 0
            extent.length = 0
          when 4
            extent.length = @readU32()
          when 8
            extent.length = @readU64()
          else
            throw new AVIFError("unsupported iloc lengthSize #{@lengthSize}", this)

  write: ->
    @writeHeader()
    @writeFullBoxHeader()

    offsetAndLength = (@offsetSize << 4) | @lengthSize
    @writeU8(offsetAndLength)
    baseOffsetSizeAndIndexSize = (@baseOffsetSize << 4) | @indexSize
    @writeU8(baseOffsetSizeAndIndexSize)

    itemCount = @items.length
    if @version < 2
      @writeU16(itemCount)
    else if @version == 2
      @writeU32(itemCount)
    else
      throw new AVIFError("unsupported iloc version #{version}", this)

    for item in @items
      if @version < 2
        @writeU16(item.id)
      else if @version == 2
        @writeU32(item.id)
      else
        throw new AVIFError("unsupported iloc version #{version}", this)

      if (@version == 1) or (@version == 2)
        @writeU16(item.constructionMethod & 0xF)

      @writeU16(item.dataReferenceIndex)
      switch @baseOffsetSize
        when 0
          null
        when 4
          @writeU32(item.baseOffset)
        when 8
          @writeU64(item.baseOffset)
        else
          throw new AVIFError("unsupported iloc baseOffsetSize #{@baseOffsetSize}", this)

      extentCount = item.extents.length
      @writeU16(extentCount)
      for extent in item.extents
        if (@version == 1) or (@version == 2)
          switch @indexSize
            when 0
              null
            when 4
              @writeU32(extent.index)
            when 8
              @writeU64(extent.index)
            else
              throw new AVIFError("unsupported iloc indexSize #{@indexSize}", this)
        switch @offsetSize
          when 0
            null
          when 4
            @writeU32(extent.offset, item.baseOffset)
          when 8
            @writeU64(extent.offset, item.baseOffset)
          else
            throw new AVIFError("unsupported iloc offsetSize #{@offsetSize}", this)
        switch @lengthSize
          when 0
            null
          when 4
            @writeU32(extent.length)
          when 8
            @writeU64(extent.length)
          else
            throw new AVIFError("unsupported iloc lengthSize #{@lengthSize}", this)

module.exports = ItemLocationBox
