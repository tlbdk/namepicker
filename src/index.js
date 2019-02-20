const fs = require('fs')
const util = require('util')
const readFileAsync = util.promisify(fs.readFile)

const pdfJs = require('pdfjs-dist')

async function main() {
  let pdfData = await readFileAsync(`${__dirname}/../resources/paplasinatais_saraksts.pdf`)
  const doc = await pdfJs.getDocument(pdfData)
  let latvianNames = ''
  for (let i = 1; i < doc.numPages + 1; i++) {
    const page = await doc.getPage(i)
    const textContents = await page.getTextContent()
    for (let item of textContents.items) {
      if (item.str.match(/^[\s\d\.\p{Lu}]*$/u)) {
        continue
      }
      latvianNames += item.str
    }
  }
  latvianNames = latvianNames
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1, $2')
    .split(/[,\s]+/)
    .filter(value => value.match(/^\p{Lu}\p{Ll}/u))
  let latvianNamesMap = new Map(latvianNames.map(name => [name, true]))
  console.log(`Total latvian names: ${latvianNames.length}`)

  let danishNamesCsvData = await readFileAsync(`${__dirname}/../resources/Alle godkendte pigenavne per 2018-12-05.csv`)
  let danishNames = danishNamesCsvData.toString().split(/\r?\n/)

  let namesAfterDanishFilter = []
  for (let name of danishNames) {
    if (latvianNamesMap.has(name)) {
      namesAfterDanishFilter.push(name)
    }
  }
  console.log(`Total names after danish filter: ${namesAfterDanishFilter.length}`)

  // From https://github.com/MatthiasWinkelmann/firstname-database
  let allFirstNamesData = await readFileAsync(`${__dirname}/../resources/firstnames.csv`)
  let firstLineOffset = allFirstNamesData.indexOf('\n')
  let headers = allFirstNamesData
    .slice(0, firstLineOffset)
    .toString()
    .split(';')

  let offset = headers.indexOf('Russia')

  let russianNames = allFirstNamesData
    .toString()
    .split('\n')
    .map(nameLine => nameLine.split(/;/))
    .filter(name => (name[offset] || -255) > -3)
  let russianNamesMap = new Map(russianNames.map(name => [name, true]))

  let namesAfterRussianFilter = []
  for (let name of namesAfterDanishFilter) {
    if (!russianNamesMap.has(name)) {
      namesAfterRussianFilter.push(name)
    }
  }
  console.log(`Total names after russian filter: ${namesAfterRussianFilter.length}`)

  let badRegex = [/^[ZTURF]/, /(?:lana|anna|beta|gunde|sja|ka|dra|mira|slava|veta|lina|rina|tina|tine|mil+a|no|fa|s)$/]

  let namesAfterBadFilter = []
  MAIN: for (let name of namesAfterRussianFilter) {
    for (let bad of badRegex) {
      if (name.match(bad)) {
        continue MAIN
      }
    }
    namesAfterBadFilter.push(name)
  }
  console.log(`Total names after bad filter: ${namesAfterBadFilter.length}`)

  for (let name of namesAfterBadFilter) {
    console.log(name)
  }
}

main().catch(e => console.error(e))
