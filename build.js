const livereload = require('livereload')
const sassCompiler = require('sass')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { rollup } = require('rollup')

/* Configurable options */
const liveReloadPort = 35729
const scssFilePath = '/src/styles.scss'
const rollupPlugins = []

/* Helpers */
const sassRender = promisify(sassCompiler.render)
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

/* Takes your HTML file and put it in /public */
const bundleHTML = async () => {
  let html = await readFile(__dirname + '/src/index.html')
  if (process.env.MODE === 'dev') {
    // in the dev environment, slap this script at the end of the HTML
    // this will reload the page whenever you save a file!
    html =
      html.toString() +
      `<script src="http://localhost:${liveReloadPort}/livereload.js?snipver=1"></script>`
  }
  await writeFile(__dirname + '/public/index.html', html)
}

/* Converts your fancy SASS to CSS */
const bundleCSS = async () => {
  const file = __dirname + scssFilePath
  const { css } = await sassRender({ file })
  await writeFile(__dirname + '/public/styles.css', css)
}

/* Runs your JS through a bundler, in case you want to make it IE-friendly for example */
const bundleJS = async () => {
  const bundle = await rollup({
    input: 'src/script.js',
    plugins: rollupPlugins,
  })
  await bundle.write({
    entryFileNames: 'not-a-react-bundle.js',
    dir: 'public',
    format: 'esm',
  })
}

// Some silly stuff for the console output. Skip this!
const consoleLogGreen = (text) => {
  console.log('\u001b[1m\u001b[32m' + text + '\u001b[39m\u001b[22m')
}

const deletePrevLineInConsole = () => {
  process.stdout.write('\r\x1b[K')
}

/* --------- ACTUAL BUILD SCRIPT --------- */
;(async () => {
  if (!fs.existsSync(__dirname + '/public/')) {
    fs.mkdirSync('public')
  }

  await Promise.all([bundleHTML(), bundleCSS(), bundleJS()])
  consoleLogGreen('Built successfully!')

  if (process.env.MODE === 'dev') {
    fs.watch(__dirname + '/src', { recursive: true }, async (_, filePath) => {
      deletePrevLineInConsole()
      process.stdout.write('Rebuilding...')

      const fileExtension = path.extname(filePath)
      if (fileExtension === '.html') {
        await bundleHTML()
      } else if (fileExtension === '.scss') {
        await bundleCSS()
      } else {
        await bundleJS()
      }

      deletePrevLineInConsole()
      process.stdout.write(`Rebuilt changes to ${filePath}`)
    })
  }

  if (process.env.MODE === 'dev') {
    const server = livereload.createServer({ port: liveReloadPort }, () =>
      consoleLogGreen('Live reload enabled')
    )
    server.watch(__dirname + '/public')
  }
})()
