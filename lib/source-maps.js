'use strict';

const fs = require('fs');
const path = require('path');

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const resolvedMapCache = new Map();

function encodeVlq (value) {
  let encoded = '';
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    encoded += BASE64[digit];
  } while (vlq > 0);
  return encoded;
}

function lineBreakLength (source, index) {
  const code = source.charCodeAt(index);
  if (code === 13) return source.charCodeAt(index + 1) === 10 ? 2 : 1;
  if (code === 10 || code === 0x2028 || code === 0x2029) return 1;
  return 0;
}

function encodeMappings (segments) {
  // Encodes a single generated line, which is all a .jsc ever reports.
  const previous = [0, 0, 0, 0, 0];
  return segments.map((segment) => segment.map((value, field) => {
    const encoded = encodeVlq(value - previous[field]);
    previous[field] = value;
    return encoded;
  }).join('')).join(',');
}

// V8 reports every bytecode frame on line 1, at the character offset into the
// compiled (wrapped) code, so the output map has a single generated line.
// `lineStarts[n]` is where source line `n` starts in that string.
function lineStartsOf (source, prefixLength) {
  const lineStarts = [prefixLength];
  for (let index = prefixLength; index < source.length;) {
    const breakLength = lineBreakLength(source, index);
    index += breakLength || 1;
    if (breakLength) lineStarts.push(index);
  }
  return lineStarts;
}

function relativeSource (outputFilename, sourceFilename) {
  return path.relative(path.dirname(outputFilename), sourceFilename).split(path.sep).join('/');
}

function createSourceMap (source, sourceFilename, outputFilename, prefixLength, input) {
  const lineStarts = lineStartsOf(source, prefixLength);
  const map = { version: 3, file: path.basename(outputFilename) };

  if (!input) {
    map.sources = [relativeSource(outputFilename, sourceFilename)];
    map.names = [];
    map.mappings = encodeMappings(lineStarts.map((start, line) => [start, 0, line, 0]));
    return map;
  }

  const segments = [];
  decodeMappings(input.map.mappings || '').forEach((line, lineIndex) => {
    if (lineIndex >= lineStarts.length) return;
    for (const mapping of line) {
      const segment = [lineStarts[lineIndex] + mapping.generatedColumn];
      if (mapping.source !== undefined) {
        segment.push(mapping.source, mapping.originalLine, mapping.originalColumn);
        if (mapping.name !== undefined) segment.push(mapping.name);
      }
      segments.push(segment);
    }
  });

  map.sources = input.map.sources.map((inputSource) => {
    if (inputSource === null || /^[a-z][a-z0-9+.-]*:/i.test(inputSource)) return inputSource;
    return relativeSource(outputFilename, path.resolve(input.directory, input.map.sourceRoot || '', inputSource));
  });
  if (input.map.sourcesContent) map.sourcesContent = input.map.sourcesContent;
  map.names = input.map.names || [];
  map.mappings = encodeMappings(segments);
  // Carry the debug ID a bundler plugin (e.g. Sentry's) put in the map. The
  // matching ID is already in the code, so it survives into the bytecode.
  const debugId = input.map.debugId || input.map.debug_id;
  if (debugId) map.debugId = debugId;
  return map;
}

// The input file's own source map: its `sourceMappingURL` comment (a file or
// a base64 data URL), else `<filename>.map`. Returns null when there is none.
function readInputSourceMap (filename, code) {
  const comments = code.match(/^[ \t]*\/\/[#@] sourceMappingURL=(\S+)[ \t]*$/gm);
  const url = comments && comments[comments.length - 1].trim().replace(/^\/\/[#@] sourceMappingURL=/, '');
  const directory = path.dirname(path.resolve(filename));
  let json, location;
  if (url && /^data:/.test(url)) {
    const match = /^data:application\/json[^,]*;base64,(.*)$/.exec(url);
    if (!match) throw new Error(`Unsupported inline source map in ${filename}`);
    json = Buffer.from(match[1], 'base64').toString('utf8');
    location = filename;
  } else {
    const candidates = url ? [path.resolve(directory, decodeURI(url))] : [];
    candidates.push(path.resolve(filename) + '.map');
    location = candidates.find((candidate) => fs.existsSync(candidate));
    if (!location) return null;
    json = fs.readFileSync(location, 'utf8');
  }

  let map;
  try {
    map = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid source map for ${filename} (${location}): ${error.message}`);
  }
  if (map.version !== 3 || !Array.isArray(map.sources) || map.sections) {
    throw new Error(`Unsupported source map for ${filename} (${location}): expected a version 3 map without sections`);
  }
  return { map, directory: location === filename ? directory : path.dirname(location) };
}

function decodeVlq (value, start) {
  let result = 0;
  let shift = 0;
  let index = start;
  let continuation;
  do {
    const digit = BASE64.indexOf(value[index++]);
    if (digit < 0) throw new Error('Invalid source map VLQ segment');
    continuation = digit & 32;
    result |= (digit & 31) << shift;
    shift += 5;
  } while (continuation && index < value.length);
  if (continuation) throw new Error('Invalid source map VLQ segment');
  const negative = result & 1;
  return { value: negative ? -(result >>> 1) : result >>> 1, next: index };
}

function decodeMappings (mappings) {
  const lines = mappings.split(';');
  let source = 0;
  let originalLine = 0;
  let originalColumn = 0;
  let name = 0;
  return lines.map((line) => {
    let generatedColumn = 0;
    return line.split(',').filter(Boolean).map((segment) => {
      let offset = 0;
      const generated = decodeVlq(segment, offset);
      offset = generated.next;
      generatedColumn += generated.value;
      const mapping = { generatedColumn };
      if (offset < segment.length) {
        const sourceDelta = decodeVlq(segment, offset);
        offset = sourceDelta.next;
        const lineDelta = decodeVlq(segment, offset);
        offset = lineDelta.next;
        const columnDelta = decodeVlq(segment, offset);
        offset = columnDelta.next;
        source += sourceDelta.value;
        originalLine += lineDelta.value;
        originalColumn += columnDelta.value;
        mapping.source = source;
        mapping.originalLine = originalLine;
        mapping.originalColumn = originalColumn;
      }
      if (offset < segment.length) {
        name += decodeVlq(segment, offset).value;
        mapping.name = name;
      }
      return mapping;
    });
  });
}

function resolveMap (compiledFilename) {
  if (typeof compiledFilename !== 'string') return null;
  if (resolvedMapCache.has(compiledFilename)) return resolvedMapCache.get(compiledFilename);
  const mapFilename = compiledFilename + '.map';
  if (!fs.existsSync(mapFilename)) return null;

  try {
    const map = JSON.parse(fs.readFileSync(mapFilename, 'utf8'));
    if (map.version !== 3 || !Array.isArray(map.sources) || !map.sources.length) return null;
    const resolved = {
      lines: decodeMappings(map.mappings || ''),
      sourceFilenames: map.sources.map((source) => source === null || /^[a-z][a-z0-9+.-]*:/i.test(source)
        ? source
        : path.resolve(path.dirname(mapFilename), map.sourceRoot || '', source))
    };
    resolvedMapCache.set(compiledFilename, resolved);
    return resolved;
  } catch (_) {
    return null;
  }
}

function hasSourceMap (compiledFilename) {
  return !!resolveMap(compiledFilename);
}

function originalPositionFor (map, line, column) {
  const segments = map.lines[line - 1];
  if (!segments) return null;
  const targetColumn = column - 1;
  let selected = null;
  for (const segment of segments) {
    if (segment.generatedColumn > targetColumn) break;
    if (segment.source !== undefined) selected = segment;
  }
  if (!selected || !map.sourceFilenames[selected.source]) return null;
  return {
    filename: map.sourceFilenames[selected.source],
    line: selected.originalLine + 1,
    column: selected.originalColumn + (targetColumn - selected.generatedColumn) + 1
  };
}

function mappedFrameString (frame, location) {
  const functionName = frame.getFunctionName() || frame.getMethodName();
  const typeName = frame.getTypeName();
  const methodName = frame.getMethodName();
  const isConstructor = frame.isConstructor && frame.isConstructor();
  let name = functionName;
  if (isConstructor && name && name.indexOf('new ') !== 0) name = 'new ' + name;
  if (typeName && methodName && functionName === methodName && name.indexOf(typeName + '.') !== 0) {
    name = typeName + '.' + name;
  }
  const locationString = `${location.filename}:${location.line}:${location.column}`;
  return name ? `    at ${name} (${locationString})` : `    at ${locationString}`;
}

function mappedCallSiteString (frame, location) {
  const formatted = mappedFrameString(frame, location).replace(/^\s+at /, '');
  return formatted;
}

let installed = false;

function installStackMapper () {
  if (installed) return;
  installed = true;
  const previous = Error.prepareStackTrace;
  Error.prepareStackTrace = function (error, frames) {
    const mappedFrames = frames.map((frame) => {
      const filename = frame.getFileName && frame.getFileName();
      const line = frame.getLineNumber && frame.getLineNumber();
      const column = frame.getColumnNumber && frame.getColumnNumber();
      const map = resolveMap(filename);
      const location = map && line && column && originalPositionFor(map, line, column);
      if (!location) return frame;

      const overrides = {
        getFileName: () => location.filename,
        getScriptNameOrSourceURL: () => location.filename,
        getLineNumber: () => location.line,
        getColumnNumber: () => location.column,
        toString: () => mappedCallSiteString(frame, location)
      };
      return new Proxy(frame, {
        get (target, property) {
          if (Object.prototype.hasOwnProperty.call(overrides, property)) return overrides[property];
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    });

    if (previous) return previous(error, mappedFrames);

    const header = error.toString();
    const stack = mappedFrames.map((frame, index) => {
      const originalFrame = frames[index];
      const filename = originalFrame.getFileName && originalFrame.getFileName();
      const line = originalFrame.getLineNumber && originalFrame.getLineNumber();
      const column = originalFrame.getColumnNumber && originalFrame.getColumnNumber();
      const map = resolveMap(filename);
      const location = map && line && column && originalPositionFor(map, line, column);
      return location ? mappedFrameString(originalFrame, location) : `    at ${originalFrame.toString()}`;
    });
    return stack.length ? `${header}\n${stack.join('\n')}` : header;
  };
}

module.exports = { createSourceMap, readInputSourceMap, hasSourceMap, installStackMapper };
