import assert from 'assert'
import { fork } from 'child_process'
import fs from 'fs'
import path from 'path'
import { describe, it, before, after } from 'mocha'

import * as bytenode from '../dist'

const TEMP_DIR = 'temp'
const TEST_FILE = 'testfile.js'
const TEST_CODE = "console.log('      Greetings from Bytenode!');"

describe('Bytenode', () => {
  let bytecode: Buffer
  describe('compileCode()', () => {
    it('compiles without error', () => {
      assert.doesNotThrow(() => {
        bytecode = bytenode.compileCode(TEST_CODE)
      })
    })
    it('returns non-zero-length buffer', () => {
      assert.notStrictEqual(bytecode.length, 0)
    })
  })

  describe('compileElectronCode()', () => {
    it('compiles code', async () => {
      let eBytecode: Buffer
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE)
      }, 'Rejection Error Compiling For Electron')
      // @ts-ignore
      assert.notStrictEqual(eBytecode.length, 0, 'Zero Length Buffer')
    })
  })

  describe('runBytecode()', () => {
    it('runs without error', () => {
      assert.doesNotThrow(() => {
        bytenode.runBytecode(bytecode)
      })
    })
  })

  describe('compileFile()', () => {
    // create temp directory
    const tempPath = path.join(__dirname, TEMP_DIR)
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath)
      }
    })

    const testFilePath = path.join(__dirname, TEST_FILE)
    const outputFile = path.join(tempPath, TEST_FILE.replace('.js', '.jsc'))
    const loaderFile = path.join(tempPath, TEST_FILE)

    it('creates non-zero length binary and loader files', async () => {
      await assert.doesNotReject((): Promise<void> => {
        return new Promise((resolve, reject) => {
          try {
            bytenode.compileFile({
              filename: testFilePath,
              output: outputFile,
              loaderFilename: '%.js'
            }).then(() => resolve())
          } catch (err) {
            reject(err)
          }
        })
      })
      const jscStats = fs.statSync(outputFile)
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist")
      assert.ok(jscStats.size, 'Zero Length .jsc File')
      const loaderStats = fs.statSync(loaderFile)
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist")
      assert.ok(loaderStats.size, 'Zero Length Loader File')
    })

    it('runs the .jsc file via require()', () => {
      assert.doesNotThrow(() => {
        require(outputFile)
      }, 'Error While Running Loader File')
    })

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath)
      }
    })
  })

  describe('compileFile() for Electron', () => {
    // create temp directory
    const tempPath = path.join(__dirname, TEMP_DIR)
    before(() => {
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath)
      }
    })

    const testFilePath = path.join(__dirname, TEST_FILE)
    const outputFile = path.join(tempPath, TEST_FILE.replace('.js', '.jsc'))
    const loaderFile = path.join(tempPath, TEST_FILE)

    it('creates non-zero length binary and loader files', async () => {
      await assert.doesNotReject((): Promise<void> => {
        return new Promise((resolve, reject) => {
          try {
            bytenode.compileFile({
              filename: testFilePath,
              output: outputFile,
              loaderFilename: '%.js',
              electron: true
            }).then(() => resolve())
          } catch (err) {
            reject(err)
          }
        })
      })
      const jscStats = fs.statSync(outputFile)
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist")
      assert.ok(jscStats.size, 'Zero Length .jsc File')
      const loaderStats = fs.statSync(loaderFile)
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist")
      assert.ok(loaderStats.size, 'Zero Length Loader File')
    })

    it('runs the .jsc file via Electron', async () => {
      await assert.doesNotReject((): Promise<void> => {
        return new Promise((resolve, reject) => {
          const electronPath = path.join('node_modules', 'electron', 'cli.js')
          const bytenodePath = path.resolve(__dirname, '../dist/cli.js')
          const proc = fork(electronPath, [bytenodePath, outputFile], {
            env: { ELECTRON_RUN_AS_NODE: '1' }
          })
          proc.on('message', message => console.log(message))
          proc.on('error', (err) => reject(err))
          proc.on('exit', () => resolve())
        })
      }, 'Rejected While Running .jsc in Electron')
    })

    after(() => {
      if (fs.existsSync(tempPath)) {
        rimraf(tempPath)
      }
    })
  })
})

/**
 * Remove directory recursively
 * @param {string} dirPath
 * @see https://stackoverflow.com/a/42505874/14350317
 */
function rimraf (dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(function (entry) {
      const entryPath = path.join(dirPath, entry)
      if (fs.lstatSync(entryPath).isDirectory()) {
        rimraf(entryPath)
      } else {
        fs.unlinkSync(entryPath)
      }
    })
    fs.rmdirSync(dirPath)
  }
}
