const assert = require('assert')
const { fork } = require('child_process')
const fs = require('fs')
const path = require('path')
const bytenode = require('../index')

const TEMP_DIR = 'temp'

const TEST_FILE = 'testfile.js'

const TEST_CODE = "console.log('      Greetings from Bytenode!');"

describe('Bytenode', () => {
  let bytecode
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
      let eBytecode
      await assert.doesNotReject(async () => {
        eBytecode = await bytenode.compileElectronCode(TEST_CODE)
      }, 'Rejection Error Compiling For Electron')
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

    it('creates a file and loader', async () => {
      await assert.doesNotReject(async () => {
        await bytenode.compileFile({
          filename: testFilePath,
          output: outputFile,
          loaderFilename: '%.js'
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
        fs.rmSync(tempPath, { recursive: true, force: true })
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

    it('creates a file and loader', async () => {
      await assert.doesNotReject(async () => {
        await bytenode.compileFile({
          filename: testFilePath,
          output: outputFile,
          loaderFilename: '%.js',
          electron: true
        })
      })
      const jscStats = fs.statSync(outputFile)
      assert.ok(jscStats.isFile(), ".jsc File Doesn't Exist")
      assert.ok(jscStats.size, 'Zero Length .jsc File')
      const loaderStats = fs.statSync(loaderFile)
      assert.ok(loaderStats.isFile(), "Loader File Doesn't Exist")
      assert.ok(loaderStats.size, 'Zero Length Loader File')
    })

    it('runs the .jsc file via Electron', () => {
      assert.doesNotReject(() => {
        return new Promise((resolve, reject) => {
          const electronPath = path.join('node_modules', 'electron', 'cli.js')
          const bytenodePath = path.join(__dirname, 'cli.js')
          const proc = fork(electronPath, [bytenodePath, outputFile], {
            env: { ELECTRON_RUN_AS_NODE: '1' },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
          })
          proc.on('error', (err) => reject(err))
          proc.on('exit', () => { resolve() })
        })
      }, 'Error While Running Loader File')
    })

    after(() => {
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true })
      }
    })
  })


})
