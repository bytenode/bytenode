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

function createSourceMap (source, sourceFilename, outputFilename, prefixLength) {
  const originalLineOffset = 0;
  const segments = [];
  let previousGeneratedColumn = 0;
  let previousSource = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;

  function addSegment (generatedColumn, originalLine) {
    segments.push(
      encodeVlq(generatedColumn - previousGeneratedColumn) +
      encodeVlq(0 - previousSource) +
      encodeVlq(originalLine - previousOriginalLine) +
      encodeVlq(0 - previousOriginalColumn)
    );
    previousGeneratedColumn = generatedColumn;
    previousSource = 0;
    previousOriginalLine = originalLine;
    previousOriginalColumn = 0;
  }

  addSegment(prefixLength, originalLineOffset);
  let originalLine = originalLineOffset;
  for (let index = 0; index < source.length;) {
    const breakLength = lineBreakLength(source, index);
    if (breakLength) {
      index += breakLength;
      originalLine++;
      addSegment(index, originalLine);
    } else {
      index++;
    }
  }

  return {
    version: 3,
    file: path.basename(outputFilename),
    sources: [path.relative(path.dirname(outputFilename), sourceFilename).split(path.sep).join('/')],
    names: [],
    mappings: segments.join(',')
  };
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
        const nameDelta = decodeVlq(segment, offset);
        mapping.name = nameDelta.value;
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
      sourceFilename: path.resolve(path.dirname(mapFilename), map.sourceRoot || '', map.sources[0])
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
  if (!selected) return null;
  return {
    filename: map.sourceFilename,
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

module.exports = { createSourceMap, hasSourceMap, installStackMapper };
