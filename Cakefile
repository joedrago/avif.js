fs = require 'fs'
util = require 'util'

browserify = require 'browserify'
coffeeify = require 'coffeeify'
uglifyify = require 'uglifyify'

makeBundle = (executable, productionBuild, mainCoffee, bundleFilename, callback) ->
  # equal of command line $ "browserify --debug -t coffeeify ./src/main.coffee > bundle.js "
  opts = {
    extensions: ['.coffee']
  }
  opts.builtins = []
  opts.detectGlobals = false
  opts.insertGlobals = false
  if productionBuild
    buildName = "Production"
  else
    buildName = "Debug"
    opts.debug = true
  b = browserify opts
  b.add mainCoffee
  b.transform coffeeify
  if productionBuild
    b.transform { global: true }, uglifyify
  b.bundle (err, result) ->
    if not err
      prepend = ""
      if executable
        prepend = "#!/usr/bin/env node\n"
      fs.writeFile bundleFilename, prepend+result, (err) ->
        if not err
          util.log "Compilation finished (#{buildName}): #{bundleFilename}"
          callback?()
        else
          util.log "Bundle write failed: " + err
          process.exit(1)
    else
      util.log "Compilation failed: " + err
      process.exit(1)

task 'build', 'build (debug)', (options) ->
  makeBundle false, false, './src/avif.coffee', "dist/avif.js", ->
    makeBundle true, false, './src/cli.coffee', "dist/cli.js", ->

task 'prod', 'build (production)', (options) ->
  makeBundle false, true, './src/avif.coffee', "dist/avif.js", ->
    makeBundle true, true, './src/avif.coffee', "dist/cli.js", ->
