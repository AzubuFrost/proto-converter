import { assembleGqlContent } from '../../index'
import { testerFactory } from '../../../testUtils/compareContent'

const schemaConverterTester = testerFactory({
  path: __dirname,
  createSourceFunc: assembleGqlContent,
  outputFileName: 'output.js',
  parser: 'typescript'
})

describe('build gql content', () => {
  it(`with params and response`, async () => schemaConverterTester('with_params_response'))
  it(`without params and response`, async () => schemaConverterTester('without_params_response'))
  it(`complex response`, async () => schemaConverterTester('complex_response'))
  it(`multiple services`, async () => schemaConverterTester('multiple_services'))
})
