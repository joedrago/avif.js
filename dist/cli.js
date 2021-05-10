#!/usr/bin/env node
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var AVIFError;

AVIFError = class AVIFError extends Error {
  constructor(message, box) {
    super(message);
    this.name = AVIFError;
    this.box = box;
  }

};

module.exports = AVIFError;


},{}],2:[function(require,module,exports){
var AVIFError, Box;

AVIFError = require('./AVIFError');

Box = class Box {
  constructor(avif, type, buffer, start, size) {
    this.avif = avif;
    this.type = type;
    this.size = size;
    this.stream = {
      buffer: buffer,
      start: start,
      offset: start,
      bytesLeft: this.size
    };
    this.version = void 0;
    this.flags = void 0;
    this.children = [];
  }

  // Overridden by derived classes
  read() {}

  write() {
    this.writeHeader();
    return this.writeContent();
  }

  writeHeader() {
    return this.avif.w.writeHeader(this.size, this.type);
  }

  writeContent() {
    return this.avif.w.writeBytes(this.stream.buffer, this.stream.start, this.size);
  }

  writeStart() {
    return this.stream.writeStart = this.writeOffset();
  }

  writeFinish() {
    var boxSize;
    boxSize = this.writeOffset() - this.stream.writeStart;
    return this.avif.w.fixU32(boxSize, this.stream.writeStart);
  }

  writeOffset() {
    return this.avif.w.offset;
  }

  writeFullBoxHeader() {
    var versionAndFlags;
    if ((this.version === null) || (this.flags === null)) {
      throw new AVIFError("Attempting to write a FullBox header on a Box that isn't a FullBox", this);
    }
    versionAndFlags = (this.version << 24) & this.flags;
    this.avif.w.writeU32(versionAndFlags);
  }

  writeU8(v) {
    return this.avif.w.writeU8(v);
  }

  writeU16(v) {
    return this.avif.w.writeU16(v);
  }

  writeU32(v, fixupBaseOffset = null) {
    return this.avif.w.writeU32(v, fixupBaseOffset);
  }

  writeU64(v, fixupBaseOffset = null) {
    return this.avif.w.writeU64(v, fixupBaseOffset);
  }

  writeFourCC(fourCC) {
    return this.avif.w.writeFourCC(fourCC);
  }

  writeChildren() {
    var child, i, len, ref;
    ref = this.children;
    for (i = 0, len = ref.length; i < len; i++) {
      child = ref[i];
      child.write();
    }
  }

  nextBox() {
    var boxSize, boxType, newBox;
    if (this.stream.bytesLeft === 0) {
      // None left; not an error
      return null;
    }
    if (this.stream.bytesLeft < 8) {
      throw new AVIFError("Not enough bytes left to read another box", this);
    }
    boxSize = this.stream.buffer.readUInt32BE(this.stream.offset);
    boxType = this.stream.buffer.toString('utf8', this.stream.offset + 4, this.stream.offset + 8);
    if (boxSize > this.stream.bytesLeft) {
      throw new AVIFError(`Truncated box of type ${boxType} (${boxSize} bytes with only ${this.stream.bytesLeft} bytes left)`, this);
    }
    if (boxSize < 8) {
      throw new AVIFError(`Bad box size of type ${boxType} (${boxSize} bytes`, this);
    }
    newBox = this.avif.factory.create(this.avif, this, boxType, this.stream.buffer, this.stream.offset + 8, boxSize - 8);
    this.stream.offset += boxSize;
    this.stream.bytesLeft -= boxSize;
    newBox.read();
    return newBox;
  }

  readChildren() {
    var box;
    while (box = this.nextBox()) {
      this.children.push(box);
    }
  }

  readFullBoxHeader() {
    var versionAndFlags;
    if (this.stream.bytesLeft < 4) {
      throw new AVIFError(`Truncated FullBox of type ${boxType} (only ${this.stream.bytesLeft} bytes left)`, this);
    }
    versionAndFlags = this.stream.buffer.readUInt32BE(this.stream.offset);
    this.version = (versionAndFlags >> 24) & 0xFF;
    this.flags = versionAndFlags & 0xFFFFFF;
    this.stream.offset += 4;
    this.stream.bytesLeft -= 4;
  }

  readU8() {
    var ret;
    if (this.stream.bytesLeft < 1) {
      throw new AVIFError(`Truncated read of U8 from box of type ${boxType} (only ${this.stream.bytesLeft} bytes left)`, this);
    }
    ret = this.stream.buffer.readUInt8(this.stream.offset);
    this.stream.offset += 1;
    this.stream.bytesLeft -= 1;
    return ret;
  }

  readU16() {
    var ret;
    if (this.stream.bytesLeft < 2) {
      throw new AVIFError(`Truncated read of U16 from box of type ${boxType} (only ${this.stream.bytesLeft} bytes left)`, this);
    }
    ret = this.stream.buffer.readUInt16BE(this.stream.offset);
    this.stream.offset += 2;
    this.stream.bytesLeft -= 2;
    return ret;
  }

  readU32() {
    var ret;
    if (this.stream.bytesLeft < 4) {
      throw new AVIFError(`Truncated read of U32 from box of type ${boxType} (only ${this.stream.bytesLeft} bytes left)`, this);
    }
    ret = this.stream.buffer.readUInt32BE(this.stream.offset);
    this.stream.offset += 4;
    this.stream.bytesLeft -= 4;
    return ret;
  }

  readU64() {
    var ret;
    if (this.stream.bytesLeft < 4) {
      throw new AVIFError(`Truncated read of U64 from box of type ${boxType} (only ${this.stream.bytesLeft} bytes left)`, this);
    }
    ret = this.stream.buffer.readUInt64BE(this.stream.offset);
    this.stream.offset += 4;
    this.stream.bytesLeft -= 4;
    return ret;
  }

  readFourCC() {
    var ret;
    if (this.stream.bytesLeft < 4) {
      throw new AVIFError(`Truncated read of FourCC from box of type ${boxType} (only ${this.stream.bytesLeft} bytes left)`, this);
    }
    ret = this.stream.buffer.toString('utf8', this.stream.offset, this.stream.offset + 4);
    this.stream.offset += 4;
    this.stream.bytesLeft -= 4;
    return ret;
  }

  readString() {
    var byte, bytesLeft, nullOffset, ret, stringLength;
    // find null terminator
    nullOffset = this.stream.offset;
    bytesLeft = this.stream.bytesLeft;
    while (bytesLeft > 0) {
      byte = this.stream.buffer.readUInt8(nullOffset);
      if (byte === 0) {
        break;
      }
      nullOffset += 1;
      bytesLeft -= 1;
    }
    if (bytesLeft === 0) {
      throw new AVIFError(`Truncated read of string from box of type ${boxType} (no null terminator found with ${this.stream.bytesLeft} bytes left)`, this);
    }
    stringLength = nullOffset - this.stream.offset;
    ret = this.stream.buffer.toString('utf8', this.stream.offset, nullOffset);
    this.stream.offset = nullOffset + 1;
    this.stream.bytesLeft -= stringLength + 1;
    return ret;
  }

};

module.exports = Box;


},{"./AVIFError":1}],3:[function(require,module,exports){
var AVIFError, Box, BoxFactory;

AVIFError = require('./AVIFError');

Box = require('./Box');

BoxFactory = class BoxFactory {
  constructor() {
    this.types = {
      FILE: {
        ftyp: require('./boxes/ftyp'),
        meta: require('./boxes/meta'),
        mdat: require('./boxes/mdat')
      },
      meta: {
        hdlr: require('./boxes/hdlr'),
        pitm: require('./boxes/pitm'),
        iloc: require('./boxes/iloc'),
        iinf: Box,
        iref: Box,
        iprp: Box
      }
    };
  }

  create(avif, parent, type, ...boxArgs) {
    var ref;
    if ((ref = this.types[parent.type]) != null ? ref.hasOwnProperty(type) : void 0) {
      return new this.types[parent.type][type](avif, type, ...boxArgs);
    }
    throw new AVIFError(`Box type ${type} cannot be inside box type ${parent.type}`, parent);
  }

};

// return new Box(avif, type, boxArgs...)
module.exports = BoxFactory;


},{"./AVIFError":1,"./Box":2,"./boxes/ftyp":5,"./boxes/hdlr":6,"./boxes/iloc":7,"./boxes/mdat":8,"./boxes/meta":9,"./boxes/pitm":10}],4:[function(require,module,exports){
var AVIF, AVIFError, Box, BoxFactory, CHUNK_SIZE, FileBox;

AVIFError = require('./AVIFError');

Box = require('./Box');

BoxFactory = require('./BoxFactory');

CHUNK_SIZE = 1024 * 1024;

FileBox = class FileBox extends Box {
  constructor(avif, buffer) {
    super(avif, "FILE", buffer, 0, buffer.length);
  }

  read() {
    var child, i, len, ref, results;
    this.readChildren();
    // For convenience
    this.boxes = {};
    ref = this.children;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      child = ref[i];
      results.push(this.boxes[child.type] = child);
    }
    return results;
  }

  write() {
    return this.writeChildren();
  }

};

AVIF = class AVIF {
  constructor() {
    this.factory = new BoxFactory();
    this.root = null;
  }

  read(buffer) {
    var e, root;
    this.root = null;
    root = new FileBox(this, buffer);
    try {
      root.read();
    } catch (error) {
      e = error;
      return e;
    }
    this.root = root;
    return null;
  }

  write() {
    var finalBuffer;
    if (this.root == null) {
      return null;
    }
    this.w = {
      buffer: Buffer.alloc(CHUNK_SIZE),
      offset: 0,
      fixups: []
    };
    this.w.makeRoom = (size) => {
      var newBuffer, newSize;
      if ((this.w.buffer.offset + size) > this.w.buffer.size) {
        newSize = this.w.buffer.size + CHUNK_SIZE;
        newBuffer = Buffer.alloc(newSize);
        this.w.buffer.copy(newBuffer);
        return this.w.buffer = newBuffer;
      }
    };
    this.w.writeHeader = (size, type) => {
      this.w.writeU32(size + 8);
      return this.w.writeFourCC(type);
    };
    this.w.writeBytes = (buffer, start, size) => {
      this.w.makeRoom(size);
      buffer.copy(this.w.buffer, this.w.offset, start, start + size);
      return this.w.offset += size;
    };
    this.w.writeFourCC = (fourCC) => {
      var typeBuffer;
      this.w.makeRoom(4);
      typeBuffer = Buffer.from(fourCC, "utf8");
      typeBuffer.copy(this.w.buffer, this.w.offset, 0, 4);
      return this.w.offset += 4;
    };
    this.w.writeU8 = (v) => {
      this.w.makeRoom(1);
      this.w.buffer.writeUInt8(v, this.w.offset);
      return this.w.offset += 1;
    };
    this.w.writeU16 = (v) => {
      this.w.makeRoom(2);
      this.w.buffer.writeUInt16BE(v, this.w.offset);
      return this.w.offset += 2;
    };
    this.w.writeU32 = (v, fixupBaseOffset = null) => {
      this.w.makeRoom(4);
      this.w.buffer.writeUInt32BE(v, this.w.offset);
      if (fixupBaseOffset !== null) {
        this.w.addFixup(32, this.w.offset, fixupBaseOffset, v);
      }
      return this.w.offset += 4;
    };
    this.w.writeU64 = (v, fixupBaseOffset = null) => {
      this.w.makeRoom(8);
      this.w.buffer.writeUInt64BE(v, this.w.offset);
      if (fixupBaseOffset !== null) {
        this.w.addFixup(64, this.w.offset, fixupBaseOffset, v);
      }
      return this.w.offset += 8;
    };
    this.w.fixU32 = (v, offset) => {
      return this.w.buffer.writeUInt32BE(v, offset);
    };
    this.w.addFixup = (type, dstOffset, fixupBaseOffset, fixupOffset) => {
      return this.w.fixups.push({
        type: type,
        dstOffset: dstOffset,
        fixupBaseOffset: fixupBaseOffset,
        fixupOffset: fixupOffset
      });
    };
    this.w.flushFixups = (box, delta) => {
      var fixup, i, len, ref, v;
      if (delta !== 0) {
        ref = this.w.fixups;
        // console.log "Fixing up #{@w.fixups.length} spots due to an mdat shift of #{delta} bytes"
        for (i = 0, len = ref.length; i < len; i++) {
          fixup = ref[i];
          if (fixup.fixupBaseOffset !== 0) {
            throw new AVIFError("Unimplemented base offset in iloc fixups", box);
          }
          // TODO: check for impossible deltas
          switch (fixup.type) {
            case 32:
              v = this.w.buffer.readUInt32BE(fixup.dstOffset);
              this.w.buffer.writeUInt32BE(v + delta, fixup.dstOffset);
              break;
            case 64:
              v = this.w.buffer.readUInt64BE(fixup.dstOffset);
              this.w.buffer.writeUInt64BE(v + delta, fixup.dstOffset);
          }
        }
      }
      this.w.fixups = [];
    };
    this.root.write();
    finalBuffer = Buffer.alloc(this.w.offset);
    this.w.buffer.copy(finalBuffer, 0, 0, this.w.offset);
    return finalBuffer;
  }

  dump() {
    var skipProps;
    if (this.root == null) {
      return;
    }
    skipProps = function(k, v) {
      switch (k) {
        case 'avif':
        case 'stream':
          return void 0;
        case 'children':
          if (v.length === 0) {
            return void 0;
          }
      }
      return v;
    };
    return JSON.stringify(this.root.boxes, skipProps, 2);
  }

};

module.exports = AVIF;


},{"./AVIFError":1,"./Box":2,"./BoxFactory":3}],5:[function(require,module,exports){
var Box, FileTypeBox;

Box = require('../Box');

FileTypeBox = class FileTypeBox extends Box {
  read() {
    var compatibleBrand, compatibleBrandCount, i, j, ref, results;
    this.majorBrand = this.readFourCC();
    this.minorVersion = this.readU32();
    this.compatibleBrands = [];
    compatibleBrandCount = Math.floor((this.size - 8) / 4);
    results = [];
    for (i = j = 0, ref = compatibleBrandCount; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
      compatibleBrand = this.readFourCC();
      results.push(this.compatibleBrands.push(compatibleBrand));
    }
    return results;
  }

  write() {
    var compatibleBrand, j, len, ref;
    this.writeStart();
    this.writeHeader();
    this.writeFourCC(this.majorBrand);
    this.writeU32(this.minorVersion);
    ref = this.compatibleBrands;
    for (j = 0, len = ref.length; j < len; j++) {
      compatibleBrand = ref[j];
      this.writeFourCC(compatibleBrand);
    }
    return this.writeFinish();
  }

};

module.exports = FileTypeBox;


},{"../Box":2}],6:[function(require,module,exports){
var Box, HandlerBox;

Box = require('../Box');

HandlerBox = class HandlerBox extends Box {
  read() {
    var i, predefined, reservedIndex;
    this.readFullBoxHeader();
    predefined = this.readU32();
    this.handlerType = this.readFourCC();
    for (reservedIndex = i = 0; i < 3; reservedIndex = ++i) {
      this.readU32();
    }
    return this.name = this.readString();
  }

};

module.exports = HandlerBox;


},{"../Box":2}],7:[function(require,module,exports){
var AVIFError, Box, ItemLocationBox;

AVIFError = require('../AVIFError');

Box = require('../Box');

ItemLocationBox = class ItemLocationBox extends Box {
  read() {
    var baseOffsetSizeAndIndexSize, extent, extentCount, extentIndex, i, id, item, itemCount, itemIndex, offsetAndLength, ref, results;
    this.readFullBoxHeader();
    offsetAndLength = this.readU8();
    this.offsetSize = offsetAndLength >> 4;
    this.lengthSize = offsetAndLength & 0xF;
    baseOffsetSizeAndIndexSize = this.readU8();
    this.baseOffsetSize = baseOffsetSizeAndIndexSize >> 4;
    if ((this.version === 1) || (this.version === 2)) {
      this.indexSize = baseOffsetSizeAndIndexSize & 0xF;
    } else {
      this.indexSize = 0;
    }
    if (this.version < 2) {
      itemCount = this.readU16();
    } else if (this.version === 2) {
      itemCount = this.readU32();
    } else {
      throw new AVIFError(`unsupported iloc version ${version}`, this);
    }
    this.items = [];
    results = [];
    for (itemIndex = i = 0, ref = itemCount; (0 <= ref ? i < ref : i > ref); itemIndex = 0 <= ref ? ++i : --i) {
      if (this.version < 2) {
        id = this.readU16();
      } else if (this.version === 2) {
        id = this.readU32();
      } else {
        throw new AVIFError(`unsupported iloc version ${version}`, this);
      }
      item = {
        id: id,
        extents: []
      };
      this.items.push(item);
      if ((this.version === 1) || (this.version === 2)) {
        item.constructionMethod = this.readU16() & 0xF;
      } else {
        item.constructionMethod = 0;
      }
      item.dataReferenceIndex = this.readU16();
      switch (this.baseOffsetSize) {
        case 0:
          item.baseOffset = 0;
          break;
        case 4:
          item.baseOffset = this.readU32();
          break;
        case 8:
          item.baseOffset = this.readU64();
          break;
        default:
          throw new AVIFError(`unsupported iloc baseOffsetSize ${this.baseOffsetSize}`, this);
      }
      extentCount = this.readU16();
      results.push((function() {
        var j, ref1, results1;
        results1 = [];
        for (extentIndex = j = 0, ref1 = extentCount; (0 <= ref1 ? j < ref1 : j > ref1); extentIndex = 0 <= ref1 ? ++j : --j) {
          extent = {
            index: 0,
            offset: 0,
            length: 0
          };
          item.extents.push(extent);
          if ((this.version === 1) || (this.version === 2)) {
            switch (this.indexSize) {
              case 0:
                extent.index = 0;
                break;
              case 4:
                extent.index = this.readU32();
                break;
              case 8:
                extent.index = this.readU64();
                break;
              default:
                throw new AVIFError(`unsupported iloc indexSize ${this.indexSize}`, this);
            }
          }
          switch (this.offsetSize) {
            case 0:
              extent.offset = 0;
              break;
            case 4:
              extent.offset = this.readU32();
              break;
            case 8:
              extent.offset = this.readU64();
              break;
            default:
              throw new AVIFError(`unsupported iloc offsetSize ${this.offsetSize}`, this);
          }
          switch (this.lengthSize) {
            case 0:
              results1.push(extent.length = 0);
              break;
            case 4:
              results1.push(extent.length = this.readU32());
              break;
            case 8:
              results1.push(extent.length = this.readU64());
              break;
            default:
              throw new AVIFError(`unsupported iloc lengthSize ${this.lengthSize}`, this);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  }

  write() {
    var baseOffsetSizeAndIndexSize, extent, extentCount, i, item, itemCount, len, offsetAndLength, ref, results;
    this.writeHeader();
    this.writeFullBoxHeader();
    offsetAndLength = (this.offsetSize << 4) | this.lengthSize;
    this.writeU8(offsetAndLength);
    baseOffsetSizeAndIndexSize = (this.baseOffsetSize << 4) | this.indexSize;
    this.writeU8(baseOffsetSizeAndIndexSize);
    itemCount = this.items.length;
    if (this.version < 2) {
      this.writeU16(itemCount);
    } else if (this.version === 2) {
      this.writeU32(itemCount);
    } else {
      throw new AVIFError(`unsupported iloc version ${version}`, this);
    }
    ref = this.items;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      if (this.version < 2) {
        this.writeU16(item.id);
      } else if (this.version === 2) {
        this.writeU32(item.id);
      } else {
        throw new AVIFError(`unsupported iloc version ${version}`, this);
      }
      if ((this.version === 1) || (this.version === 2)) {
        this.writeU16(item.constructionMethod & 0xF);
      }
      this.writeU16(item.dataReferenceIndex);
      switch (this.baseOffsetSize) {
        case 0:
          null;
          break;
        case 4:
          this.writeU32(item.baseOffset);
          break;
        case 8:
          this.writeU64(item.baseOffset);
          break;
        default:
          throw new AVIFError(`unsupported iloc baseOffsetSize ${this.baseOffsetSize}`, this);
      }
      extentCount = item.extents.length;
      this.writeU16(extentCount);
      results.push((function() {
        var j, len1, ref1, results1;
        ref1 = item.extents;
        results1 = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          extent = ref1[j];
          if ((this.version === 1) || (this.version === 2)) {
            switch (this.indexSize) {
              case 0:
                null;
                break;
              case 4:
                this.writeU32(extent.index);
                break;
              case 8:
                this.writeU64(extent.index);
                break;
              default:
                throw new AVIFError(`unsupported iloc indexSize ${this.indexSize}`, this);
            }
          }
          switch (this.offsetSize) {
            case 0:
              null;
              break;
            case 4:
              this.writeU32(extent.offset, item.baseOffset);
              break;
            case 8:
              this.writeU64(extent.offset, item.baseOffset);
              break;
            default:
              throw new AVIFError(`unsupported iloc offsetSize ${this.offsetSize}`, this);
          }
          switch (this.lengthSize) {
            case 0:
              results1.push(null);
              break;
            case 4:
              results1.push(this.writeU32(extent.length));
              break;
            case 8:
              results1.push(this.writeU64(extent.length));
              break;
            default:
              throw new AVIFError(`unsupported iloc lengthSize ${this.lengthSize}`, this);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  }

};

module.exports = ItemLocationBox;


},{"../AVIFError":1,"../Box":2}],8:[function(require,module,exports){
var Box, MediaDataBox;

Box = require('../Box');

MediaDataBox = class MediaDataBox extends Box {
  write() {
    var delta, newOffset, oldOffset;
    oldOffset = this.stream.offset - 8;
    newOffset = this.writeOffset();
    delta = newOffset - oldOffset;
    super.write();
    return this.avif.w.flushFixups(this, delta);
  }

};

module.exports = MediaDataBox;


},{"../Box":2}],9:[function(require,module,exports){
var Box, MetaBox;

Box = require('../Box');

MetaBox = class MetaBox extends Box {
  read() {
    this.readFullBoxHeader();
    return this.readChildren();
  }

  write() {
    this.writeStart();
    this.writeHeader();
    this.writeFullBoxHeader();
    this.writeChildren();
    return this.writeFinish();
  }

};

module.exports = MetaBox;


},{"../Box":2}],10:[function(require,module,exports){
var Box, PrimaryItemBox;

Box = require('../Box');

PrimaryItemBox = class PrimaryItemBox extends Box {
  read() {
    this.readFullBoxHeader();
    if (this.version === 0) {
      return this.id = this.readU16();
    } else {
      return this.id = this.readU32();
    }
  }

};

module.exports = PrimaryItemBox;


},{"../Box":2}],11:[function(require,module,exports){
var AVIF, fs, main;

fs = require('fs');

AVIF = require("./avif");

main = function(argv) {
  var avif, buf, error, inputFilename, outputFilename, rawBuffer, ref;
  inputFilename = argv.shift();
  if (inputFilename == null) {
    console.log("Syntax: avifjs [inputFilename]");
    return;
  }
  rawBuffer = fs.readFileSync(inputFilename);
  avif = new AVIF();
  error = avif.read(rawBuffer);
  if (error != null) {
    console.log(`Error: ${e.message}, box type ${(ref = e.box) != null ? ref.type : void 0}`);
    return;
  }
  // avif.root.boxes.ftyp.compatibleBrands = []
  // avif.root.boxes.ftyp.compatibleBrands.push "yolo"
  console.log(avif.dump());
  buf = avif.write();
  if (buf != null) {
    outputFilename = `${inputFilename}.out.avif`;
    console.log(`Writing ${buf.length} bytes: ${outputFilename}`);
    return fs.writeFileSync(outputFilename, buf);
  } else {
    return console.log("Nothing to write:", buf);
  }
};

main(process.argv.slice(2));


},{"./avif":4,"fs":undefined}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQVZJRkVycm9yLmNvZmZlZSIsInNyYy9Cb3guY29mZmVlIiwic3JjL0JveEZhY3RvcnkuY29mZmVlIiwic3JjL2F2aWYuY29mZmVlIiwic3JjL2JveGVzL2Z0eXAuY29mZmVlIiwic3JjL2JveGVzL2hkbHIuY29mZmVlIiwic3JjL2JveGVzL2lsb2MuY29mZmVlIiwic3JjL2JveGVzL21kYXQuY29mZmVlIiwic3JjL2JveGVzL21ldGEuY29mZmVlIiwic3JjL2JveGVzL3BpdG0uY29mZmVlIiwic3JjL2NsaS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFNLFlBQU4sTUFBQSxVQUFBLFFBQXdCLE1BQXhCO0VBQ0UsV0FBYSxDQUFDLE9BQUQsRUFBVSxHQUFWLENBQUE7U0FDWCxDQUFNLE9BQU47SUFDQSxJQUFDLENBQUEsSUFBRCxHQUFRO0lBQ1IsSUFBQyxDQUFBLEdBQUQsR0FBTztFQUhJOztBQURmOztBQU1BLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7O0FDTmpCLElBQUEsU0FBQSxFQUFBOztBQUFBLFNBQUEsR0FBWSxPQUFBLENBQVEsYUFBUjs7QUFFTixNQUFOLE1BQUEsSUFBQTtFQUNFLFdBQWEsS0FBQSxNQUFBLEVBQWUsTUFBZixFQUF1QixLQUF2QixNQUFBLENBQUE7SUFBQyxJQUFDLENBQUE7SUFBTSxJQUFDLENBQUE7SUFBcUIsSUFBQyxDQUFBO0lBQzFDLElBQUMsQ0FBQSxNQUFELEdBQ0U7TUFBQSxNQUFBLEVBQVEsTUFBUjtNQUNBLEtBQUEsRUFBTyxLQURQO01BRUEsTUFBQSxFQUFRLEtBRlI7TUFHQSxTQUFBLEVBQVcsSUFBQyxDQUFBO0lBSFo7SUFJRixJQUFDLENBQUEsT0FBRCxHQUFXO0lBQ1gsSUFBQyxDQUFBLEtBQUQsR0FBUztJQUNULElBQUMsQ0FBQSxRQUFELEdBQVk7RUFSRCxDQUFmOzs7RUFXRSxJ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ZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiY2xhc3MgQVZJRkVycm9yIGV4dGVuZHMgRXJyb3JcclxuICBjb25zdHJ1Y3RvcjogKG1lc3NhZ2UsIGJveCkgLT5cclxuICAgIHN1cGVyIG1lc3NhZ2VcclxuICAgIEBuYW1lID0gQVZJRkVycm9yXHJcbiAgICBAYm94ID0gYm94XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFWSUZFcnJvclxyXG4iLCJBVklGRXJyb3IgPSByZXF1aXJlICcuL0FWSUZFcnJvcidcclxuXHJcbmNsYXNzIEJveFxyXG4gIGNvbnN0cnVjdG9yOiAoQGF2aWYsIEB0eXBlLCBidWZmZXIsIHN0YXJ0LCBAc2l6ZSkgLT5cclxuICAgIEBzdHJlYW0gPVxyXG4gICAgICBidWZmZXI6IGJ1ZmZlclxyXG4gICAgICBzdGFydDogc3RhcnRcclxuICAgICAgb2Zmc2V0OiBzdGFydFxyXG4gICAgICBieXRlc0xlZnQ6IEBzaXplXHJcbiAgICBAdmVyc2lvbiA9IHVuZGVmaW5lZFxyXG4gICAgQGZsYWdzID0gdW5kZWZpbmVkXHJcbiAgICBAY2hpbGRyZW4gPSBbXVxyXG5cclxuICAjIE92ZXJyaWRkZW4gYnkgZGVyaXZlZCBjbGFzc2VzXHJcbiAgcmVhZDogLT5cclxuICB3cml0ZTogLT5cclxuICAgIEB3cml0ZUhlYWRlcigpXHJcbiAgICBAd3JpdGVDb250ZW50KClcclxuXHJcbiAgd3JpdGVIZWFkZXI6IC0+XHJcbiAgICBAYXZpZi53LndyaXRlSGVhZGVyKEBzaXplLCBAdHlwZSlcclxuICB3cml0ZUNvbnRlbnQ6IC0+XHJcbiAgICBAYXZpZi53LndyaXRlQnl0ZXMoQHN0cmVhbS5idWZmZXIsIEBzdHJlYW0uc3RhcnQsIEBzaXplKVxyXG5cclxuICB3cml0ZVN0YXJ0OiAtPlxyXG4gICAgQHN0cmVhbS53cml0ZVN0YXJ0ID0gQHdyaXRlT2Zmc2V0KClcclxuICB3cml0ZUZpbmlzaDogLT5cclxuICAgIGJveFNpemUgPSBAd3JpdGVPZmZzZXQoKSAtIEBzdHJlYW0ud3JpdGVTdGFydFxyXG4gICAgQGF2aWYudy5maXhVMzIoYm94U2l6ZSwgQHN0cmVhbS53cml0ZVN0YXJ0KVxyXG5cclxuICB3cml0ZU9mZnNldDogLT5cclxuICAgIHJldHVybiBAYXZpZi53Lm9mZnNldFxyXG5cclxuICB3cml0ZUZ1bGxCb3hIZWFkZXI6IC0+XHJcbiAgICBpZiAoQHZlcnNpb24gPT0gbnVsbCkgb3IgKEBmbGFncyA9PSBudWxsKVxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiQXR0ZW1wdGluZyB0byB3cml0ZSBhIEZ1bGxCb3ggaGVhZGVyIG9uIGEgQm94IHRoYXQgaXNuJ3QgYSBGdWxsQm94XCIsIHRoaXMpXHJcbiAgICB2ZXJzaW9uQW5kRmxhZ3MgPSAoQHZlcnNpb24gPDwgMjQpICYgQGZsYWdzXHJcbiAgICBAYXZpZi53LndyaXRlVTMyKHZlcnNpb25BbmRGbGFncylcclxuICAgIHJldHVyblxyXG5cclxuICB3cml0ZVU4OiAodikgLT5cclxuICAgIEBhdmlmLncud3JpdGVVOCh2KVxyXG4gIHdyaXRlVTE2OiAodikgLT5cclxuICAgIEBhdmlmLncud3JpdGVVMTYodilcclxuICB3cml0ZVUzMjogKHYsIGZpeHVwQmFzZU9mZnNldCA9IG51bGwpIC0+XHJcbiAgICBAYXZpZi53LndyaXRlVTMyKHYsIGZpeHVwQmFzZU9mZnNldClcclxuICB3cml0ZVU2NDogKHYsIGZpeHVwQmFzZU9mZnNldCA9IG51bGwpIC0+XHJcbiAgICBAYXZpZi53LndyaXRlVTY0KHYsIGZpeHVwQmFzZU9mZnNldClcclxuXHJcbiAgd3JpdGVGb3VyQ0M6IChmb3VyQ0MpIC0+XHJcbiAgICBAYXZpZi53LndyaXRlRm91ckNDKGZvdXJDQylcclxuXHJcbiAgd3JpdGVDaGlsZHJlbjogLT5cclxuICAgIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cclxuICAgICAgY2hpbGQud3JpdGUoKVxyXG4gICAgcmV0dXJuXHJcblxyXG4gIG5leHRCb3g6IC0+XHJcbiAgICBpZiBAc3RyZWFtLmJ5dGVzTGVmdCA9PSAwXHJcbiAgICAgICMgTm9uZSBsZWZ0OyBub3QgYW4gZXJyb3JcclxuICAgICAgcmV0dXJuIG51bGxcclxuICAgIGlmIEBzdHJlYW0uYnl0ZXNMZWZ0IDwgOFxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiTm90IGVub3VnaCBieXRlcyBsZWZ0IHRvIHJlYWQgYW5vdGhlciBib3hcIiwgdGhpcylcclxuICAgIGJveFNpemUgPSBAc3RyZWFtLmJ1ZmZlci5yZWFkVUludDMyQkUoQHN0cmVhbS5vZmZzZXQpXHJcbiAgICBib3hUeXBlID0gQHN0cmVhbS5idWZmZXIudG9TdHJpbmcoJ3V0ZjgnLCBAc3RyZWFtLm9mZnNldCArIDQsIEBzdHJlYW0ub2Zmc2V0ICsgOClcclxuICAgIGlmIGJveFNpemUgPiBAc3RyZWFtLmJ5dGVzTGVmdFxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiVHJ1bmNhdGVkIGJveCBvZiB0eXBlICN7Ym94VHlwZX0gKCN7Ym94U2l6ZX0gYnl0ZXMgd2l0aCBvbmx5ICN7QHN0cmVhbS5ieXRlc0xlZnR9IGJ5dGVzIGxlZnQpXCIsIHRoaXMpXHJcbiAgICBpZiBib3hTaXplIDwgOFxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiQmFkIGJveCBzaXplIG9mIHR5cGUgI3tib3hUeXBlfSAoI3tib3hTaXplfSBieXRlc1wiLCB0aGlzKVxyXG4gICAgbmV3Qm94ID0gQGF2aWYuZmFjdG9yeS5jcmVhdGUoQGF2aWYsIHRoaXMsIGJveFR5cGUsIEBzdHJlYW0uYnVmZmVyLCBAc3RyZWFtLm9mZnNldCArIDgsIGJveFNpemUgLSA4KVxyXG4gICAgQHN0cmVhbS5vZmZzZXQgKz0gYm94U2l6ZVxyXG4gICAgQHN0cmVhbS5ieXRlc0xlZnQgLT0gYm94U2l6ZVxyXG5cclxuICAgIG5ld0JveC5yZWFkKClcclxuICAgIHJldHVybiBuZXdCb3hcclxuXHJcbiAgcmVhZENoaWxkcmVuOiAtPlxyXG4gICAgd2hpbGUgYm94ID0gQG5leHRCb3goKVxyXG4gICAgICBAY2hpbGRyZW4ucHVzaCBib3hcclxuICAgIHJldHVyblxyXG5cclxuICByZWFkRnVsbEJveEhlYWRlcjogLT5cclxuICAgIGlmIEBzdHJlYW0uYnl0ZXNMZWZ0IDwgNFxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiVHJ1bmNhdGVkIEZ1bGxCb3ggb2YgdHlwZSAje2JveFR5cGV9IChvbmx5ICN7QHN0cmVhbS5ieXRlc0xlZnR9IGJ5dGVzIGxlZnQpXCIsIHRoaXMpXHJcbiAgICB2ZXJzaW9uQW5kRmxhZ3MgPSBAc3RyZWFtLmJ1ZmZlci5yZWFkVUludDMyQkUoQHN0cmVhbS5vZmZzZXQpXHJcbiAgICBAdmVyc2lvbiA9ICh2ZXJzaW9uQW5kRmxhZ3MgPj4gMjQpICYgMHhGRlxyXG4gICAgQGZsYWdzID0gdmVyc2lvbkFuZEZsYWdzICYgMHhGRkZGRkZcclxuICAgIEBzdHJlYW0ub2Zmc2V0ICs9IDRcclxuICAgIEBzdHJlYW0uYnl0ZXNMZWZ0IC09IDRcclxuICAgIHJldHVyblxyXG5cclxuICByZWFkVTg6IC0+XHJcbiAgICBpZiBAc3RyZWFtLmJ5dGVzTGVmdCA8IDFcclxuICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcIlRydW5jYXRlZCByZWFkIG9mIFU4IGZyb20gYm94IG9mIHR5cGUgI3tib3hUeXBlfSAob25seSAje0BzdHJlYW0uYnl0ZXNMZWZ0fSBieXRlcyBsZWZ0KVwiLCB0aGlzKVxyXG4gICAgcmV0ID0gQHN0cmVhbS5idWZmZXIucmVhZFVJbnQ4KEBzdHJlYW0ub2Zmc2V0KVxyXG4gICAgQHN0cmVhbS5vZmZzZXQgKz0gMVxyXG4gICAgQHN0cmVhbS5ieXRlc0xlZnQgLT0gMVxyXG4gICAgcmV0dXJuIHJldFxyXG5cclxuICByZWFkVTE2OiAtPlxyXG4gICAgaWYgQHN0cmVhbS5ieXRlc0xlZnQgPCAyXHJcbiAgICAgIHRocm93IG5ldyBBVklGRXJyb3IoXCJUcnVuY2F0ZWQgcmVhZCBvZiBVMTYgZnJvbSBib3ggb2YgdHlwZSAje2JveFR5cGV9IChvbmx5ICN7QHN0cmVhbS5ieXRlc0xlZnR9IGJ5dGVzIGxlZnQpXCIsIHRoaXMpXHJcbiAgICByZXQgPSBAc3RyZWFtLmJ1ZmZlci5yZWFkVUludDE2QkUoQHN0cmVhbS5vZmZzZXQpXHJcbiAgICBAc3RyZWFtLm9mZnNldCArPSAyXHJcbiAgICBAc3RyZWFtLmJ5dGVzTGVmdCAtPSAyXHJcbiAgICByZXR1cm4gcmV0XHJcblxyXG4gIHJlYWRVMzI6IC0+XHJcbiAgICBpZiBAc3RyZWFtLmJ5dGVzTGVmdCA8IDRcclxuICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcIlRydW5jYXRlZCByZWFkIG9mIFUzMiBmcm9tIGJveCBvZiB0eXBlICN7Ym94VHlwZX0gKG9ubHkgI3tAc3RyZWFtLmJ5dGVzTGVmdH0gYnl0ZXMgbGVmdClcIiwgdGhpcylcclxuICAgIHJldCA9IEBzdHJlYW0uYnVmZmVyLnJlYWRVSW50MzJCRShAc3RyZWFtLm9mZnNldClcclxuICAgIEBzdHJlYW0ub2Zmc2V0ICs9IDRcclxuICAgIEBzdHJlYW0uYnl0ZXNMZWZ0IC09IDRcclxuICAgIHJldHVybiByZXRcclxuXHJcbiAgcmVhZFU2NDogLT5cclxuICAgIGlmIEBzdHJlYW0uYnl0ZXNMZWZ0IDwgNFxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiVHJ1bmNhdGVkIHJlYWQgb2YgVTY0IGZyb20gYm94IG9mIHR5cGUgI3tib3hUeXBlfSAob25seSAje0BzdHJlYW0uYnl0ZXNMZWZ0fSBieXRlcyBsZWZ0KVwiLCB0aGlzKVxyXG4gICAgcmV0ID0gQHN0cmVhbS5idWZmZXIucmVhZFVJbnQ2NEJFKEBzdHJlYW0ub2Zmc2V0KVxyXG4gICAgQHN0cmVhbS5vZmZzZXQgKz0gNFxyXG4gICAgQHN0cmVhbS5ieXRlc0xlZnQgLT0gNFxyXG4gICAgcmV0dXJuIHJldFxyXG5cclxuICByZWFkRm91ckNDOiAtPlxyXG4gICAgaWYgQHN0cmVhbS5ieXRlc0xlZnQgPCA0XHJcbiAgICAgIHRocm93IG5ldyBBVklGRXJyb3IoXCJUcnVuY2F0ZWQgcmVhZCBvZiBGb3VyQ0MgZnJvbSBib3ggb2YgdHlwZSAje2JveFR5cGV9IChvbmx5ICN7QHN0cmVhbS5ieXRlc0xlZnR9IGJ5dGVzIGxlZnQpXCIsIHRoaXMpXHJcbiAgICByZXQgPSBAc3RyZWFtLmJ1ZmZlci50b1N0cmluZygndXRmOCcsIEBzdHJlYW0ub2Zmc2V0LCBAc3RyZWFtLm9mZnNldCArIDQpXHJcbiAgICBAc3RyZWFtLm9mZnNldCArPSA0XHJcbiAgICBAc3RyZWFtLmJ5dGVzTGVmdCAtPSA0XHJcbiAgICByZXR1cm4gcmV0XHJcblxyXG4gIHJlYWRTdHJpbmc6IC0+XHJcbiAgICAjIGZpbmQgbnVsbCB0ZXJtaW5hdG9yXHJcbiAgICBudWxsT2Zmc2V0ID0gQHN0cmVhbS5vZmZzZXRcclxuICAgIGJ5dGVzTGVmdCA9IEBzdHJlYW0uYnl0ZXNMZWZ0XHJcbiAgICB3aGlsZSBieXRlc0xlZnQgPiAwXHJcbiAgICAgIGJ5dGUgPSBAc3RyZWFtLmJ1ZmZlci5yZWFkVUludDgobnVsbE9mZnNldClcclxuICAgICAgaWYgYnl0ZSA9PSAwXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgbnVsbE9mZnNldCArPSAxXHJcbiAgICAgIGJ5dGVzTGVmdCAtPSAxXHJcbiAgICBpZiBieXRlc0xlZnQgPT0gMFxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwiVHJ1bmNhdGVkIHJlYWQgb2Ygc3RyaW5nIGZyb20gYm94IG9mIHR5cGUgI3tib3hUeXBlfSAobm8gbnVsbCB0ZXJtaW5hdG9yIGZvdW5kIHdpdGggI3tAc3RyZWFtLmJ5dGVzTGVmdH0gYnl0ZXMgbGVmdClcIiwgdGhpcylcclxuXHJcbiAgICBzdHJpbmdMZW5ndGggPSBudWxsT2Zmc2V0IC0gQHN0cmVhbS5vZmZzZXRcclxuICAgIHJldCA9IEBzdHJlYW0uYnVmZmVyLnRvU3RyaW5nKCd1dGY4JywgQHN0cmVhbS5vZmZzZXQsIG51bGxPZmZzZXQpXHJcbiAgICBAc3RyZWFtLm9mZnNldCA9IG51bGxPZmZzZXQgKyAxXHJcbiAgICBAc3RyZWFtLmJ5dGVzTGVmdCAtPSBzdHJpbmdMZW5ndGggKyAxXHJcbiAgICByZXR1cm4gcmV0XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJveFxyXG4iLCJBVklGRXJyb3IgPSByZXF1aXJlICcuL0FWSUZFcnJvcidcclxuQm94ID0gcmVxdWlyZSAnLi9Cb3gnXHJcblxyXG5jbGFzcyBCb3hGYWN0b3J5XHJcbiAgY29uc3RydWN0b3I6IC0+XHJcbiAgICBAdHlwZXMgPVxyXG4gICAgICBGSUxFOlxyXG4gICAgICAgIGZ0eXA6IHJlcXVpcmUoJy4vYm94ZXMvZnR5cCcpXHJcbiAgICAgICAgbWV0YTogcmVxdWlyZSgnLi9ib3hlcy9tZXRhJylcclxuICAgICAgICBtZGF0OiByZXF1aXJlKCcuL2JveGVzL21kYXQnKVxyXG4gICAgICBtZXRhOlxyXG4gICAgICAgIGhkbHI6IHJlcXVpcmUoJy4vYm94ZXMvaGRscicpXHJcbiAgICAgICAgcGl0bTogcmVxdWlyZSgnLi9ib3hlcy9waXRtJylcclxuICAgICAgICBpbG9jOiByZXF1aXJlKCcuL2JveGVzL2lsb2MnKVxyXG4gICAgICAgIGlpbmY6IEJveFxyXG4gICAgICAgIGlyZWY6IEJveFxyXG4gICAgICAgIGlwcnA6IEJveFxyXG5cclxuICBjcmVhdGU6IChhdmlmLCBwYXJlbnQsIHR5cGUsIC4uLmJveEFyZ3MpIC0+XHJcbiAgICBpZiBAdHlwZXNbcGFyZW50LnR5cGVdPy5oYXNPd25Qcm9wZXJ0eSh0eXBlKVxyXG4gICAgICByZXR1cm4gbmV3IEB0eXBlc1twYXJlbnQudHlwZV1bdHlwZV0oYXZpZiwgdHlwZSwgYm94QXJncy4uLilcclxuICAgIHRocm93IG5ldyBBVklGRXJyb3IoXCJCb3ggdHlwZSAje3R5cGV9IGNhbm5vdCBiZSBpbnNpZGUgYm94IHR5cGUgI3twYXJlbnQudHlwZX1cIiwgcGFyZW50KVxyXG4gICAgIyByZXR1cm4gbmV3IEJveChhdmlmLCB0eXBlLCBib3hBcmdzLi4uKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCb3hGYWN0b3J5XHJcbiIsIkFWSUZFcnJvciA9IHJlcXVpcmUgJy4vQVZJRkVycm9yJ1xyXG5Cb3ggPSByZXF1aXJlICcuL0JveCdcclxuQm94RmFjdG9yeSA9IHJlcXVpcmUgJy4vQm94RmFjdG9yeSdcclxuXHJcbkNIVU5LX1NJWkUgPSAxMDI0ICogMTAyNFxyXG5cclxuY2xhc3MgRmlsZUJveCBleHRlbmRzIEJveFxyXG4gIGNvbnN0cnVjdG9yOiAoYXZpZiwgYnVmZmVyKSAtPlxyXG4gICAgc3VwZXIoYXZpZiwgXCJGSUxFXCIsIGJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aClcclxuICByZWFkOiAtPlxyXG4gICAgQHJlYWRDaGlsZHJlbigpXHJcblxyXG4gICAgIyBGb3IgY29udmVuaWVuY2VcclxuICAgIEBib3hlcyA9IHt9XHJcbiAgICBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXHJcbiAgICAgIEBib3hlc1tjaGlsZC50eXBlXSA9IGNoaWxkXHJcblxyXG4gIHdyaXRlOiAtPlxyXG4gICAgQHdyaXRlQ2hpbGRyZW4oKVxyXG5cclxuY2xhc3MgQVZJRlxyXG4gIGNvbnN0cnVjdG9yOiAtPlxyXG4gICAgQGZhY3RvcnkgPSBuZXcgQm94RmFjdG9yeSgpXHJcbiAgICBAcm9vdCA9IG51bGxcclxuXHJcbiAgcmVhZDogKGJ1ZmZlcikgLT5cclxuICAgIEByb290ID0gbnVsbFxyXG4gICAgcm9vdCA9IG5ldyBGaWxlQm94KHRoaXMsIGJ1ZmZlcilcclxuICAgIHRyeVxyXG4gICAgICByb290LnJlYWQoKVxyXG4gICAgY2F0Y2ggZVxyXG4gICAgICByZXR1cm4gZVxyXG4gICAgQHJvb3QgPSByb290XHJcbiAgICByZXR1cm4gbnVsbFxyXG5cclxuICB3cml0ZTogLT5cclxuICAgIGlmIG5vdCBAcm9vdD9cclxuICAgICAgcmV0dXJuIG51bGxcclxuXHJcbiAgICBAdyA9XHJcbiAgICAgIGJ1ZmZlcjogQnVmZmVyLmFsbG9jKENIVU5LX1NJWkUpXHJcbiAgICAgIG9mZnNldDogMFxyXG4gICAgICBmaXh1cHM6IFtdXHJcblxyXG4gICAgQHcubWFrZVJvb20gPSAoc2l6ZSkgPT5cclxuICAgICAgaWYgKEB3LmJ1ZmZlci5vZmZzZXQgKyBzaXplKSA+IEB3LmJ1ZmZlci5zaXplXHJcbiAgICAgICAgbmV3U2l6ZSA9IEB3LmJ1ZmZlci5zaXplICsgQ0hVTktfU0laRVxyXG4gICAgICAgIG5ld0J1ZmZlciA9IEJ1ZmZlci5hbGxvYyhuZXdTaXplKVxyXG4gICAgICAgIEB3LmJ1ZmZlci5jb3B5KG5ld0J1ZmZlcilcclxuICAgICAgICBAdy5idWZmZXIgPSBuZXdCdWZmZXJcclxuXHJcbiAgICBAdy53cml0ZUhlYWRlciA9IChzaXplLCB0eXBlKSA9PlxyXG4gICAgICBAdy53cml0ZVUzMihzaXplICsgOClcclxuICAgICAgQHcud3JpdGVGb3VyQ0ModHlwZSlcclxuXHJcbiAgICBAdy53cml0ZUJ5dGVzID0gKGJ1ZmZlciwgc3RhcnQsIHNpemUpID0+XHJcbiAgICAgIEB3Lm1ha2VSb29tKHNpemUpXHJcbiAgICAgIGJ1ZmZlci5jb3B5KEB3LmJ1ZmZlciwgQHcub2Zmc2V0LCBzdGFydCwgc3RhcnQgKyBzaXplKVxyXG4gICAgICBAdy5vZmZzZXQgKz0gc2l6ZVxyXG5cclxuICAgIEB3LndyaXRlRm91ckNDID0gKGZvdXJDQykgPT5cclxuICAgICAgQHcubWFrZVJvb20oNClcclxuICAgICAgdHlwZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGZvdXJDQywgXCJ1dGY4XCIpXHJcbiAgICAgIHR5cGVCdWZmZXIuY29weShAdy5idWZmZXIsIEB3Lm9mZnNldCwgMCwgNClcclxuICAgICAgQHcub2Zmc2V0ICs9IDRcclxuXHJcbiAgICBAdy53cml0ZVU4ID0gKHYpID0+XHJcbiAgICAgIEB3Lm1ha2VSb29tKDEpXHJcbiAgICAgIEB3LmJ1ZmZlci53cml0ZVVJbnQ4KHYsIEB3Lm9mZnNldClcclxuICAgICAgQHcub2Zmc2V0ICs9IDFcclxuICAgIEB3LndyaXRlVTE2ID0gKHYpID0+XHJcbiAgICAgIEB3Lm1ha2VSb29tKDIpXHJcbiAgICAgIEB3LmJ1ZmZlci53cml0ZVVJbnQxNkJFKHYsIEB3Lm9mZnNldClcclxuICAgICAgQHcub2Zmc2V0ICs9IDJcclxuICAgIEB3LndyaXRlVTMyID0gKHYsIGZpeHVwQmFzZU9mZnNldCA9IG51bGwpID0+XHJcbiAgICAgIEB3Lm1ha2VSb29tKDQpXHJcbiAgICAgIEB3LmJ1ZmZlci53cml0ZVVJbnQzMkJFKHYsIEB3Lm9mZnNldClcclxuICAgICAgaWYgZml4dXBCYXNlT2Zmc2V0ICE9IG51bGxcclxuICAgICAgICBAdy5hZGRGaXh1cCgzMiwgQHcub2Zmc2V0LCBmaXh1cEJhc2VPZmZzZXQsIHYpXHJcbiAgICAgIEB3Lm9mZnNldCArPSA0XHJcbiAgICBAdy53cml0ZVU2NCA9ICh2LCBmaXh1cEJhc2VPZmZzZXQgPSBudWxsKSA9PlxyXG4gICAgICBAdy5tYWtlUm9vbSg4KVxyXG4gICAgICBAdy5idWZmZXIud3JpdGVVSW50NjRCRSh2LCBAdy5vZmZzZXQpXHJcbiAgICAgIGlmIGZpeHVwQmFzZU9mZnNldCAhPSBudWxsXHJcbiAgICAgICAgQHcuYWRkRml4dXAoNjQsIEB3Lm9mZnNldCwgZml4dXBCYXNlT2Zmc2V0LCB2KVxyXG4gICAgICBAdy5vZmZzZXQgKz0gOFxyXG5cclxuICAgIEB3LmZpeFUzMiA9ICh2LCBvZmZzZXQpID0+XHJcbiAgICAgIEB3LmJ1ZmZlci53cml0ZVVJbnQzMkJFKHYsIG9mZnNldClcclxuXHJcbiAgICBAdy5hZGRGaXh1cCA9ICh0eXBlLCBkc3RPZmZzZXQsIGZpeHVwQmFzZU9mZnNldCwgZml4dXBPZmZzZXQpID0+XHJcbiAgICAgIEB3LmZpeHVwcy5wdXNoIHtcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgZHN0T2Zmc2V0OiBkc3RPZmZzZXRcclxuICAgICAgICBmaXh1cEJhc2VPZmZzZXQ6IGZpeHVwQmFzZU9mZnNldFxyXG4gICAgICAgIGZpeHVwT2Zmc2V0OiBmaXh1cE9mZnNldFxyXG4gICAgICB9XHJcblxyXG4gICAgQHcuZmx1c2hGaXh1cHMgPSAoYm94LCBkZWx0YSkgPT5cclxuICAgICAgaWYgZGVsdGEgIT0gMFxyXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJGaXhpbmcgdXAgI3tAdy5maXh1cHMubGVuZ3RofSBzcG90cyBkdWUgdG8gYW4gbWRhdCBzaGlmdCBvZiAje2RlbHRhfSBieXRlc1wiXHJcbiAgICAgICAgZm9yIGZpeHVwIGluIEB3LmZpeHVwc1xyXG4gICAgICAgICAgaWYgZml4dXAuZml4dXBCYXNlT2Zmc2V0ICE9IDBcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcIlVuaW1wbGVtZW50ZWQgYmFzZSBvZmZzZXQgaW4gaWxvYyBmaXh1cHNcIiwgYm94KVxyXG4gICAgICAgICAgIyBUT0RPOiBjaGVjayBmb3IgaW1wb3NzaWJsZSBkZWx0YXNcclxuICAgICAgICAgIHN3aXRjaCBmaXh1cC50eXBlXHJcbiAgICAgICAgICAgIHdoZW4gMzJcclxuICAgICAgICAgICAgICB2ID0gQHcuYnVmZmVyLnJlYWRVSW50MzJCRShmaXh1cC5kc3RPZmZzZXQpXHJcbiAgICAgICAgICAgICAgQHcuYnVmZmVyLndyaXRlVUludDMyQkUodiArIGRlbHRhLCBmaXh1cC5kc3RPZmZzZXQpXHJcbiAgICAgICAgICAgIHdoZW4gNjRcclxuICAgICAgICAgICAgICB2ID0gQHcuYnVmZmVyLnJlYWRVSW50NjRCRShmaXh1cC5kc3RPZmZzZXQpXHJcbiAgICAgICAgICAgICAgQHcuYnVmZmVyLndyaXRlVUludDY0QkUodiArIGRlbHRhLCBmaXh1cC5kc3RPZmZzZXQpXHJcbiAgICAgIEB3LmZpeHVwcyA9IFtdXHJcbiAgICAgIHJldHVyblxyXG5cclxuICAgIEByb290LndyaXRlKClcclxuICAgIGZpbmFsQnVmZmVyID0gQnVmZmVyLmFsbG9jKEB3Lm9mZnNldClcclxuICAgIEB3LmJ1ZmZlci5jb3B5KGZpbmFsQnVmZmVyLCAwLCAwLCBAdy5vZmZzZXQpXHJcbiAgICByZXR1cm4gZmluYWxCdWZmZXJcclxuXHJcbiAgZHVtcDogLT5cclxuICAgIGlmIG5vdCBAcm9vdD9cclxuICAgICAgcmV0dXJuXHJcbiAgICBza2lwUHJvcHMgPSAoaywgdikgLT5cclxuICAgICAgc3dpdGNoIGtcclxuICAgICAgICB3aGVuICdhdmlmJywgJ3N0cmVhbSdcclxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgICAgICB3aGVuICdjaGlsZHJlbidcclxuICAgICAgICAgIGlmIHYubGVuZ3RoID09IDBcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gICAgICByZXR1cm4gdlxyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KEByb290LmJveGVzLCBza2lwUHJvcHMsIDIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFWSUZcclxuIiwiQm94ID0gcmVxdWlyZSAnLi4vQm94J1xyXG5cclxuY2xhc3MgRmlsZVR5cGVCb3ggZXh0ZW5kcyBCb3hcclxuICByZWFkOiAtPlxyXG4gICAgQG1ham9yQnJhbmQgPSBAcmVhZEZvdXJDQygpXHJcbiAgICBAbWlub3JWZXJzaW9uID0gQHJlYWRVMzIoKVxyXG4gICAgQGNvbXBhdGlibGVCcmFuZHMgPSBbXVxyXG4gICAgY29tcGF0aWJsZUJyYW5kQ291bnQgPSBNYXRoLmZsb29yKChAc2l6ZSAtIDgpIC8gNClcclxuICAgIGZvciBpIGluIFswLi4uY29tcGF0aWJsZUJyYW5kQ291bnRdXHJcbiAgICAgIGNvbXBhdGlibGVCcmFuZCA9IEByZWFkRm91ckNDKClcclxuICAgICAgQGNvbXBhdGlibGVCcmFuZHMucHVzaCBjb21wYXRpYmxlQnJhbmRcclxuXHJcbiAgd3JpdGU6IC0+XHJcbiAgICBAd3JpdGVTdGFydCgpXHJcbiAgICBAd3JpdGVIZWFkZXIoKVxyXG4gICAgQHdyaXRlRm91ckNDKEBtYWpvckJyYW5kKVxyXG4gICAgQHdyaXRlVTMyKEBtaW5vclZlcnNpb24pXHJcbiAgICBmb3IgY29tcGF0aWJsZUJyYW5kIGluIEBjb21wYXRpYmxlQnJhbmRzXHJcbiAgICAgIEB3cml0ZUZvdXJDQyhjb21wYXRpYmxlQnJhbmQpXHJcbiAgICBAd3JpdGVGaW5pc2goKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGaWxlVHlwZUJveFxyXG4iLCJCb3ggPSByZXF1aXJlICcuLi9Cb3gnXHJcblxyXG5jbGFzcyBIYW5kbGVyQm94IGV4dGVuZHMgQm94XHJcbiAgcmVhZDogLT5cclxuICAgIEByZWFkRnVsbEJveEhlYWRlcigpXHJcbiAgICBwcmVkZWZpbmVkID0gQHJlYWRVMzIoKVxyXG4gICAgQGhhbmRsZXJUeXBlID0gQHJlYWRGb3VyQ0MoKVxyXG4gICAgZm9yIHJlc2VydmVkSW5kZXggaW4gWzAuLi4zXVxyXG4gICAgICBAcmVhZFUzMigpXHJcbiAgICBAbmFtZSA9IEByZWFkU3RyaW5nKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlckJveFxyXG4iLCJBVklGRXJyb3IgPSByZXF1aXJlICcuLi9BVklGRXJyb3InXHJcbkJveCA9IHJlcXVpcmUgJy4uL0JveCdcclxuXHJcbmNsYXNzIEl0ZW1Mb2NhdGlvbkJveCBleHRlbmRzIEJveFxyXG4gIHJlYWQ6IC0+XHJcbiAgICBAcmVhZEZ1bGxCb3hIZWFkZXIoKVxyXG5cclxuICAgIG9mZnNldEFuZExlbmd0aCA9IEByZWFkVTgoKVxyXG4gICAgQG9mZnNldFNpemUgPSBvZmZzZXRBbmRMZW5ndGggPj4gNFxyXG4gICAgQGxlbmd0aFNpemUgPSBvZmZzZXRBbmRMZW5ndGggJiAweEZcclxuXHJcbiAgICBiYXNlT2Zmc2V0U2l6ZUFuZEluZGV4U2l6ZSA9IEByZWFkVTgoKVxyXG4gICAgQGJhc2VPZmZzZXRTaXplID0gYmFzZU9mZnNldFNpemVBbmRJbmRleFNpemUgPj4gNFxyXG4gICAgaWYgKEB2ZXJzaW9uID09IDEpIG9yIChAdmVyc2lvbiA9PSAyKVxyXG4gICAgICBAaW5kZXhTaXplID0gYmFzZU9mZnNldFNpemVBbmRJbmRleFNpemUgJiAweEZcclxuICAgIGVsc2VcclxuICAgICAgQGluZGV4U2l6ZSA9IDBcclxuXHJcbiAgICBpZiBAdmVyc2lvbiA8IDJcclxuICAgICAgaXRlbUNvdW50ID0gQHJlYWRVMTYoKVxyXG4gICAgZWxzZSBpZiBAdmVyc2lvbiA9PSAyXHJcbiAgICAgIGl0ZW1Db3VudCA9IEByZWFkVTMyKClcclxuICAgIGVsc2VcclxuICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcInVuc3VwcG9ydGVkIGlsb2MgdmVyc2lvbiAje3ZlcnNpb259XCIsIHRoaXMpXHJcblxyXG4gICAgQGl0ZW1zID0gW11cclxuICAgIGZvciBpdGVtSW5kZXggaW4gWzAuLi5pdGVtQ291bnRdXHJcbiAgICAgIGlmIEB2ZXJzaW9uIDwgMlxyXG4gICAgICAgIGlkID0gQHJlYWRVMTYoKVxyXG4gICAgICBlbHNlIGlmIEB2ZXJzaW9uID09IDJcclxuICAgICAgICBpZCA9IEByZWFkVTMyKClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIHRocm93IG5ldyBBVklGRXJyb3IoXCJ1bnN1cHBvcnRlZCBpbG9jIHZlcnNpb24gI3t2ZXJzaW9ufVwiLCB0aGlzKVxyXG5cclxuICAgICAgaXRlbSA9XHJcbiAgICAgICAgaWQ6IGlkXHJcbiAgICAgICAgZXh0ZW50czogW11cclxuICAgICAgQGl0ZW1zLnB1c2ggaXRlbVxyXG5cclxuICAgICAgaWYgKEB2ZXJzaW9uID09IDEpIG9yIChAdmVyc2lvbiA9PSAyKVxyXG4gICAgICAgIGl0ZW0uY29uc3RydWN0aW9uTWV0aG9kID0gQHJlYWRVMTYoKSAmIDB4RlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaXRlbS5jb25zdHJ1Y3Rpb25NZXRob2QgPSAwXHJcblxyXG4gICAgICBpdGVtLmRhdGFSZWZlcmVuY2VJbmRleCA9IEByZWFkVTE2KClcclxuICAgICAgc3dpdGNoIEBiYXNlT2Zmc2V0U2l6ZVxyXG4gICAgICAgIHdoZW4gMFxyXG4gICAgICAgICAgaXRlbS5iYXNlT2Zmc2V0ID0gMFxyXG4gICAgICAgIHdoZW4gNFxyXG4gICAgICAgICAgaXRlbS5iYXNlT2Zmc2V0ID0gQHJlYWRVMzIoKVxyXG4gICAgICAgIHdoZW4gOFxyXG4gICAgICAgICAgaXRlbS5iYXNlT2Zmc2V0ID0gQHJlYWRVNjQoKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHRocm93IG5ldyBBVklGRXJyb3IoXCJ1bnN1cHBvcnRlZCBpbG9jIGJhc2VPZmZzZXRTaXplICN7QGJhc2VPZmZzZXRTaXplfVwiLCB0aGlzKVxyXG5cclxuICAgICAgZXh0ZW50Q291bnQgPSBAcmVhZFUxNigpXHJcbiAgICAgIGZvciBleHRlbnRJbmRleCBpbiBbMC4uLmV4dGVudENvdW50XVxyXG4gICAgICAgIGV4dGVudCA9XHJcbiAgICAgICAgICBpbmRleDogMFxyXG4gICAgICAgICAgb2Zmc2V0OiAwXHJcbiAgICAgICAgICBsZW5ndGg6IDBcclxuICAgICAgICBpdGVtLmV4dGVudHMucHVzaCBleHRlbnRcclxuICAgICAgICBpZiAoQHZlcnNpb24gPT0gMSkgb3IgKEB2ZXJzaW9uID09IDIpXHJcbiAgICAgICAgICBzd2l0Y2ggQGluZGV4U2l6ZVxyXG4gICAgICAgICAgICB3aGVuIDBcclxuICAgICAgICAgICAgICBleHRlbnQuaW5kZXggPSAwXHJcbiAgICAgICAgICAgIHdoZW4gNFxyXG4gICAgICAgICAgICAgIGV4dGVudC5pbmRleCA9IEByZWFkVTMyKClcclxuICAgICAgICAgICAgd2hlbiA4XHJcbiAgICAgICAgICAgICAgZXh0ZW50LmluZGV4ID0gQHJlYWRVNjQoKVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcInVuc3VwcG9ydGVkIGlsb2MgaW5kZXhTaXplICN7QGluZGV4U2l6ZX1cIiwgdGhpcylcclxuICAgICAgICBzd2l0Y2ggQG9mZnNldFNpemVcclxuICAgICAgICAgIHdoZW4gMFxyXG4gICAgICAgICAgICBleHRlbnQub2Zmc2V0ID0gMFxyXG4gICAgICAgICAgd2hlbiA0XHJcbiAgICAgICAgICAgIGV4dGVudC5vZmZzZXQgPSBAcmVhZFUzMigpXHJcbiAgICAgICAgICB3aGVuIDhcclxuICAgICAgICAgICAgZXh0ZW50Lm9mZnNldCA9IEByZWFkVTY0KClcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcInVuc3VwcG9ydGVkIGlsb2Mgb2Zmc2V0U2l6ZSAje0BvZmZzZXRTaXplfVwiLCB0aGlzKVxyXG4gICAgICAgIHN3aXRjaCBAbGVuZ3RoU2l6ZVxyXG4gICAgICAgICAgd2hlbiAwXHJcbiAgICAgICAgICAgIGV4dGVudC5sZW5ndGggPSAwXHJcbiAgICAgICAgICB3aGVuIDRcclxuICAgICAgICAgICAgZXh0ZW50Lmxlbmd0aCA9IEByZWFkVTMyKClcclxuICAgICAgICAgIHdoZW4gOFxyXG4gICAgICAgICAgICBleHRlbnQubGVuZ3RoID0gQHJlYWRVNjQoKVxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwidW5zdXBwb3J0ZWQgaWxvYyBsZW5ndGhTaXplICN7QGxlbmd0aFNpemV9XCIsIHRoaXMpXHJcblxyXG4gIHdyaXRlOiAtPlxyXG4gICAgQHdyaXRlSGVhZGVyKClcclxuICAgIEB3cml0ZUZ1bGxCb3hIZWFkZXIoKVxyXG5cclxuICAgIG9mZnNldEFuZExlbmd0aCA9IChAb2Zmc2V0U2l6ZSA8PCA0KSB8IEBsZW5ndGhTaXplXHJcbiAgICBAd3JpdGVVOChvZmZzZXRBbmRMZW5ndGgpXHJcbiAgICBiYXNlT2Zmc2V0U2l6ZUFuZEluZGV4U2l6ZSA9IChAYmFzZU9mZnNldFNpemUgPDwgNCkgfCBAaW5kZXhTaXplXHJcbiAgICBAd3JpdGVVOChiYXNlT2Zmc2V0U2l6ZUFuZEluZGV4U2l6ZSlcclxuXHJcbiAgICBpdGVtQ291bnQgPSBAaXRlbXMubGVuZ3RoXHJcbiAgICBpZiBAdmVyc2lvbiA8IDJcclxuICAgICAgQHdyaXRlVTE2KGl0ZW1Db3VudClcclxuICAgIGVsc2UgaWYgQHZlcnNpb24gPT0gMlxyXG4gICAgICBAd3JpdGVVMzIoaXRlbUNvdW50KVxyXG4gICAgZWxzZVxyXG4gICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwidW5zdXBwb3J0ZWQgaWxvYyB2ZXJzaW9uICN7dmVyc2lvbn1cIiwgdGhpcylcclxuXHJcbiAgICBmb3IgaXRlbSBpbiBAaXRlbXNcclxuICAgICAgaWYgQHZlcnNpb24gPCAyXHJcbiAgICAgICAgQHdyaXRlVTE2KGl0ZW0uaWQpXHJcbiAgICAgIGVsc2UgaWYgQHZlcnNpb24gPT0gMlxyXG4gICAgICAgIEB3cml0ZVUzMihpdGVtLmlkKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcInVuc3VwcG9ydGVkIGlsb2MgdmVyc2lvbiAje3ZlcnNpb259XCIsIHRoaXMpXHJcblxyXG4gICAgICBpZiAoQHZlcnNpb24gPT0gMSkgb3IgKEB2ZXJzaW9uID09IDIpXHJcbiAgICAgICAgQHdyaXRlVTE2KGl0ZW0uY29uc3RydWN0aW9uTWV0aG9kICYgMHhGKVxyXG5cclxuICAgICAgQHdyaXRlVTE2KGl0ZW0uZGF0YVJlZmVyZW5jZUluZGV4KVxyXG4gICAgICBzd2l0Y2ggQGJhc2VPZmZzZXRTaXplXHJcbiAgICAgICAgd2hlbiAwXHJcbiAgICAgICAgICBudWxsXHJcbiAgICAgICAgd2hlbiA0XHJcbiAgICAgICAgICBAd3JpdGVVMzIoaXRlbS5iYXNlT2Zmc2V0KVxyXG4gICAgICAgIHdoZW4gOFxyXG4gICAgICAgICAgQHdyaXRlVTY0KGl0ZW0uYmFzZU9mZnNldClcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwidW5zdXBwb3J0ZWQgaWxvYyBiYXNlT2Zmc2V0U2l6ZSAje0BiYXNlT2Zmc2V0U2l6ZX1cIiwgdGhpcylcclxuXHJcbiAgICAgIGV4dGVudENvdW50ID0gaXRlbS5leHRlbnRzLmxlbmd0aFxyXG4gICAgICBAd3JpdGVVMTYoZXh0ZW50Q291bnQpXHJcbiAgICAgIGZvciBleHRlbnQgaW4gaXRlbS5leHRlbnRzXHJcbiAgICAgICAgaWYgKEB2ZXJzaW9uID09IDEpIG9yIChAdmVyc2lvbiA9PSAyKVxyXG4gICAgICAgICAgc3dpdGNoIEBpbmRleFNpemVcclxuICAgICAgICAgICAgd2hlbiAwXHJcbiAgICAgICAgICAgICAgbnVsbFxyXG4gICAgICAgICAgICB3aGVuIDRcclxuICAgICAgICAgICAgICBAd3JpdGVVMzIoZXh0ZW50LmluZGV4KVxyXG4gICAgICAgICAgICB3aGVuIDhcclxuICAgICAgICAgICAgICBAd3JpdGVVNjQoZXh0ZW50LmluZGV4KVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEFWSUZFcnJvcihcInVuc3VwcG9ydGVkIGlsb2MgaW5kZXhTaXplICN7QGluZGV4U2l6ZX1cIiwgdGhpcylcclxuICAgICAgICBzd2l0Y2ggQG9mZnNldFNpemVcclxuICAgICAgICAgIHdoZW4gMFxyXG4gICAgICAgICAgICBudWxsXHJcbiAgICAgICAgICB3aGVuIDRcclxuICAgICAgICAgICAgQHdyaXRlVTMyKGV4dGVudC5vZmZzZXQsIGl0ZW0uYmFzZU9mZnNldClcclxuICAgICAgICAgIHdoZW4gOFxyXG4gICAgICAgICAgICBAd3JpdGVVNjQoZXh0ZW50Lm9mZnNldCwgaXRlbS5iYXNlT2Zmc2V0KVxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwidW5zdXBwb3J0ZWQgaWxvYyBvZmZzZXRTaXplICN7QG9mZnNldFNpemV9XCIsIHRoaXMpXHJcbiAgICAgICAgc3dpdGNoIEBsZW5ndGhTaXplXHJcbiAgICAgICAgICB3aGVuIDBcclxuICAgICAgICAgICAgbnVsbFxyXG4gICAgICAgICAgd2hlbiA0XHJcbiAgICAgICAgICAgIEB3cml0ZVUzMihleHRlbnQubGVuZ3RoKVxyXG4gICAgICAgICAgd2hlbiA4XHJcbiAgICAgICAgICAgIEB3cml0ZVU2NChleHRlbnQubGVuZ3RoKVxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgQVZJRkVycm9yKFwidW5zdXBwb3J0ZWQgaWxvYyBsZW5ndGhTaXplICN7QGxlbmd0aFNpemV9XCIsIHRoaXMpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEl0ZW1Mb2NhdGlvbkJveFxyXG4iLCJCb3ggPSByZXF1aXJlICcuLi9Cb3gnXHJcblxyXG5jbGFzcyBNZWRpYURhdGFCb3ggZXh0ZW5kcyBCb3hcclxuICB3cml0ZTogLT5cclxuICAgIG9sZE9mZnNldCA9IEBzdHJlYW0ub2Zmc2V0IC0gOFxyXG4gICAgbmV3T2Zmc2V0ID0gQHdyaXRlT2Zmc2V0KClcclxuICAgIGRlbHRhID0gbmV3T2Zmc2V0IC0gb2xkT2Zmc2V0XHJcbiAgICBzdXBlcigpXHJcbiAgICBAYXZpZi53LmZsdXNoRml4dXBzKHRoaXMsIGRlbHRhKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYURhdGFCb3hcclxuIiwiQm94ID0gcmVxdWlyZSAnLi4vQm94J1xyXG5cclxuY2xhc3MgTWV0YUJveCBleHRlbmRzIEJveFxyXG4gIHJlYWQ6IC0+XHJcbiAgICBAcmVhZEZ1bGxCb3hIZWFkZXIoKVxyXG4gICAgQHJlYWRDaGlsZHJlbigpXHJcbiAgd3JpdGU6IC0+XHJcbiAgICBAd3JpdGVTdGFydCgpXHJcbiAgICBAd3JpdGVIZWFkZXIoKVxyXG4gICAgQHdyaXRlRnVsbEJveEhlYWRlcigpXHJcbiAgICBAd3JpdGVDaGlsZHJlbigpXHJcbiAgICBAd3JpdGVGaW5pc2goKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZXRhQm94XHJcbiIsIkJveCA9IHJlcXVpcmUgJy4uL0JveCdcclxuXHJcbmNsYXNzIFByaW1hcnlJdGVtQm94IGV4dGVuZHMgQm94XHJcbiAgcmVhZDogLT5cclxuICAgIEByZWFkRnVsbEJveEhlYWRlcigpXHJcbiAgICBpZiBAdmVyc2lvbiA9PSAwXHJcbiAgICAgIEBpZCA9IEByZWFkVTE2KClcclxuICAgIGVsc2VcclxuICAgICAgQGlkID0gQHJlYWRVMzIoKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQcmltYXJ5SXRlbUJveFxyXG4iLCJmcyA9IHJlcXVpcmUgJ2ZzJ1xyXG5cclxuQVZJRiA9IHJlcXVpcmUgXCIuL2F2aWZcIlxyXG5cclxubWFpbiA9IChhcmd2KSAtPlxyXG4gIGlucHV0RmlsZW5hbWUgPSBhcmd2LnNoaWZ0KClcclxuICBpZiBub3QgaW5wdXRGaWxlbmFtZT9cclxuICAgIGNvbnNvbGUubG9nIFwiU3ludGF4OiBhdmlmanMgW2lucHV0RmlsZW5hbWVdXCJcclxuICAgIHJldHVyblxyXG5cclxuICByYXdCdWZmZXIgPSBmcy5yZWFkRmlsZVN5bmMoaW5wdXRGaWxlbmFtZSlcclxuICBhdmlmID0gbmV3IEFWSUZcclxuICBlcnJvciA9IGF2aWYucmVhZChyYXdCdWZmZXIpXHJcbiAgaWYgZXJyb3I/XHJcbiAgICBjb25zb2xlLmxvZyBcIkVycm9yOiAje2UubWVzc2FnZX0sIGJveCB0eXBlICN7ZS5ib3g/LnR5cGV9XCJcclxuICAgIHJldHVyblxyXG5cclxuICAjIGF2aWYucm9vdC5ib3hlcy5mdHlwLmNvbXBhdGlibGVCcmFuZHMgPSBbXVxyXG4gICMgYXZpZi5yb290LmJveGVzLmZ0eXAuY29tcGF0aWJsZUJyYW5kcy5wdXNoIFwieW9sb1wiXHJcblxyXG4gIGNvbnNvbGUubG9nIGF2aWYuZHVtcCgpXHJcbiAgYnVmID0gYXZpZi53cml0ZSgpXHJcbiAgaWYgYnVmP1xyXG4gICAgb3V0cHV0RmlsZW5hbWUgPSBcIiN7aW5wdXRGaWxlbmFtZX0ub3V0LmF2aWZcIlxyXG4gICAgY29uc29sZS5sb2cgXCJXcml0aW5nICN7YnVmLmxlbmd0aH0gYnl0ZXM6ICN7b3V0cHV0RmlsZW5hbWV9XCJcclxuICAgIGZzLndyaXRlRmlsZVN5bmMob3V0cHV0RmlsZW5hbWUsIGJ1ZilcclxuICBlbHNlXHJcbiAgICBjb25zb2xlLmxvZyBcIk5vdGhpbmcgdG8gd3JpdGU6XCIsIGJ1ZlxyXG5cclxubWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpXHJcbiJdfQ==
