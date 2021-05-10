Box = require '../Box'

class FileTypeBox extends Box
  read: ->
    @majorBrand = @readFourCC()
    @minorVersion = @readU32()
    @compatibleBrands = []
    compatibleBrandCount = Math.floor((@size - 8) / 4)
    for i in [0...compatibleBrandCount]
      compatibleBrand = @readFourCC()
      @compatibleBrands.push compatibleBrand

  write: ->
    @writeStart()
    @writeHeader()
    @writeFourCC(@majorBrand)
    @writeU32(@minorVersion)
    for compatibleBrand in @compatibleBrands
      @writeFourCC(compatibleBrand)
    @writeFinish()

module.exports = FileTypeBox
