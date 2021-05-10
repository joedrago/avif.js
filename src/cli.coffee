fs = require 'fs'

AVIF = require "./avif"

main = (argv) ->
  inputFilename = argv.shift()
  if not inputFilename?
    console.log "Syntax: avifjs [inputFilename]"
    return

  rawBuffer = fs.readFileSync(inputFilename)
  avif = new AVIF
  error = avif.read(rawBuffer)
  if error?
    console.log "Error: #{e.message}, box type #{e.box?.type}"
    return

  # avif.root.boxes.ftyp.compatibleBrands = []
  # avif.root.boxes.ftyp.compatibleBrands.push "yolo"

  console.log avif.dump()
  buf = avif.write()
  if buf?
    outputFilename = "#{inputFilename}.out.avif"
    console.log "Writing #{buf.length} bytes: #{outputFilename}"
    fs.writeFileSync(outputFilename, buf)
  else
    console.log "Nothing to write:", buf

main(process.argv.slice(2))
