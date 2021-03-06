import {
  assembleComment,
  isScalar,
  isRequired,
  isEnum,
  ProtoInfo,
  isMapField,
  AllField,
  EnhancedReflectionObject,
} from '../utils'
import { isEmpty } from 'lodash'
import { createProtoTypeByMapField } from '../createMapMessage'

const ScalarTypeMap = {
  double: 'number',
  float: 'number',
  int32: 'number',
  // TODO: read from configuration
  int64: 'string',
  uint32: 'number',
  uint64: 'string',
  sint32: 'number',
  sint64: 'string',
  fixed32: 'number',
  fixed64: 'string',
  sfixed32: 'number',
  sfixed64: 'string',
  bool: 'boolean',
  string: 'string',
  bytes: 'string',
}

export class SchemaTyping {
  private types: Map<string, string> = new Map([])
  private root: protobuf.Root
  private messages: EnhancedReflectionObject[]

  constructor({ root, messages }: ProtoInfo) {
    this.root = root
    this.messages = messages
    this.createFieldsType(messages)
  }

  createSource() {
    return [...this.types.values()].flat().join('\n')
  }

  // TODO: doesn't handle oneofs yet
  private createFieldsType(messages: ProtoInfo['messages']) {
    messages.forEach((m) => this.handleMessage(m))
  }

  private handleMessage(message: EnhancedReflectionObject) {
    let type: string
    if (isEnum(message)) {
      type = this.createEnumType(message as protobuf.Enum)
    } else {
      type = this.createMessageType(message as protobuf.Type)
    }
    this.types.set(message.name, type)
  }

  private createMessageType(message: protobuf.Type) {
    const { name, fieldsArray } = message
    return `
    export interface ${name} {
      ${this.createFieldItem(fieldsArray)}
    }
    `
  }

  private createFieldItem(fieldsArray: protobuf.Field[]) {
    if (isEmpty(fieldsArray)) return ''
    return fieldsArray.map(this.createTypeItem.bind(this)).join('\n')
  }

  private createTypeItem(field: AllField) {
    const { name, comment } = field
    const requiredSignal = isRequired(field) ? '' : '?'
    const parsedComment = assembleComment({ comment, inline: true })
    return `${parsedComment}${name}${requiredSignal}: ${this.createTypeValue(
      field,
    )}`
  }

  private createTypeValue(field: AllField) {
    const { repeated, type } = field
    let typeValue: string
    if (isMapField(field)) {
      typeValue = this.handleMapValue(field)
    } else if (isScalar(type)) {
      typeValue = ScalarTypeMap[type]
    } else {
      typeValue =
        (
          this.messages.find(({ name }) => name === type) ||
          this.root.lookup(type)
        )?.name || ''
    }
    return `${typeValue}${repeated ? '[]' : ''}`
  }

  private handleMapValue(field: AllField) {
    const mapMessage = createProtoTypeByMapField(field as protobuf.MapField)
    this.handleMessage(mapMessage as any)
    return mapMessage.name
  }

  private createEnumType(enumMessage: protobuf.Enum) {
    return `
    ${assembleComment(enumMessage.comment)}
    export enum ${enumMessage.name} {
      ${this.createEnumItem(enumMessage)}
    }
    `
  }

  // TODO: should be from configuration
  private createEnumItem(enumMessage: protobuf.Enum) {
    const { values, comments } = enumMessage
    return Object.keys(values)
      .map(
        (key: string) =>`
        ${assembleComment({
            comment: comments[key],
            inline: true,
          })}${key} = "${key}"`,
      )
      .join(',')
  }
}

export const createSchemaTypingSource = (protoInfo: ProtoInfo) =>
  new SchemaTyping(protoInfo).createSource()

export default createSchemaTypingSource
