AVIFError = require './AVIFError'
Box = require './Box'

class BoxFactory
  constructor: ->
    @types =
      FILE:
        ftyp: require('./boxes/ftyp')
        meta: require('./boxes/meta')
        mdat: require('./boxes/mdat')
      meta:
        hdlr: require('./boxes/hdlr')
        pitm: require('./boxes/pitm')
        iloc: require('./boxes/iloc')
        iinf: Box
        iref: Box
        iprp: Box

  create: (avif, parent, type, ...boxArgs) ->
    if @types[parent.type]?.hasOwnProperty(type)
      return new @types[parent.type][type](avif, type, boxArgs...)
    throw new AVIFError("Box type #{type} cannot be inside box type #{parent.type}", parent)
    # return new Box(avif, type, boxArgs...)

module.exports = BoxFactory
