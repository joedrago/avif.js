class AVIFError extends Error
  constructor: (message, box) ->
    super message
    @name = AVIFError
    @box = box

module.exports = AVIFError
