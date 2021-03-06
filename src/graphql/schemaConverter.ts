import protobuf from 'protobufjs'
import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLNamedType,
  printType,
} from 'graphql'
import {
  fullTypeName,
  convertScalar,
  isScalar,
  isRequired,
  isMapField,
  isEnum,
  EnhancedReflectionObject,
  AllField, ProtoInfo
} from '../utils'
import { isEmpty, reduce } from 'lodash'
import { createProtoTypeByMapField } from '../createMapMessage'

export default class SchemaConverter {
  private types: Map<string, GraphQLNamedType> = new Map([])
  private root: protobuf.Root
  private messages: EnhancedReflectionObject[]

  constructor({messages,root}: ProtoInfo) {
    this.root = root
    this.messages = messages
    this.createSchema()
  }

  private createSchema() {
    this.messages.forEach((m) => this.convertMessageAndEnum(m))
  }

  private convertMessageAndEnum(object: EnhancedReflectionObject) {
    const typeName = fullTypeName(object)
    const existedType = this.existType(typeName)
    if (existedType) return existedType
    let type: GraphQLNamedType
    if (isEnum(object as protobuf.Field)) {
      type = this.convertEnum(object as protobuf.Enum)
    } else {
      type = this.convertMessage(object as protobuf.Type)
    }
    return this.addType(typeName, type)
  }

  private convertMessage(message: protobuf.Type) {
    const fields = isEmpty(message.fieldsArray)
      ? {}
      : this.convertFields(message.fieldsArray)
    return new ((message as any).isInput
      ? GraphQLInputObjectType
      : GraphQLObjectType)({
      name: fullTypeName(message),
      fields: () => fields,
    })
  }

  private convertFields(fields: protobuf.Field[]) {
    const createField = (fields: any, field: protobuf.Field) => {
      const name = field.partOf ? field.partOf.name : field.name
      const type = field.partOf
        ? this.convertOneOf(field.partOf)
        : this.convertFieldType(field)
      fields[name] = { type }
      return fields
    }
    return reduce(fields, createField, {})
  }

  private convertEnum(enm: protobuf.Enum) {
    const enumType = new GraphQLEnumType({
      name: fullTypeName(enm),
      values: Object.assign(
        {},
        ...Object.keys(enm.values).map((key) => ({
          [key]: {
            value: enm.values[key].valueOf(),
          },
        }))
      ),
    })
    return enumType
  }

  private convertFieldType(field: AllField) {
    const type = isMapField(field)
      ? this.convertMapField(field as protobuf.MapField)
      : this.convertDataType(field as protobuf.Field)
    return isRequired(field) ? new GraphQLNonNull(type) : type
  }

  private convertMapField(mapField: protobuf.MapField) {
    // TODO: read the create-function from config
    const mapMessage = createProtoTypeByMapField(mapField)
    return this.convertMessageAndEnum(mapMessage)
  }

  private convertDataType(field: AllField) {
    const { type, repeated } = field
    const baseType = isScalar(type) ? convertScalar(type) : this.getType(type)
    return repeated ? new GraphQLList(baseType) : baseType
  }

  private convertOneOf(oneOf: protobuf.OneOf) {
    const name = fullTypeName(oneOf)
    const types = oneOf.fieldsArray.map((field) => this.convertFieldType(field))
    const unionType = new GraphQLUnionType({
      name,
      types: () => types,
    })
    return this.addType(name, unionType)
  }

  private lookupMessage(name: string) {
    const message =
      this.messages.find((m) => m.name === name) || this.root.lookup(name)
    if (!message) {
      throw new Error(`can't find "${name}" in messages`)
    }
    return message
  }

  private addType(name: string, type: GraphQLNamedType) {
    this.types.set(name, type)
    return type
  }

  private existType(name: string) {
    return this.types.get(name)
  }

  private getType(typeName: string) {
    const targetField = this.lookupMessage(typeName)
    const name = fullTypeName(targetField.name)
    return this.existType(name) || this.convertMessageAndEnum(targetField)
  }

  getSchemas() {
    return [...this.types.values()].sort().map((t) => printType(t))
  }
}
