# proto-converter

Converts schema definitions in Protocol Buffer (proto3) to GraphQL([@emzeq/proto2graphql](https://github.com/emzeq/proto2graphql#readme) inspires me).  
you can also convert to TypeScript or anything you want by plugins.

# Installation

Install with npm:

```sh
npm install --save-dev proto-converter
```

# Usage

In your `proto-converter.config.js` at the root directory of project:

```js
const { buildGql, buildInterface } = require('proto-converter')

module.exports = {
  // the directory contains proto files
  sourcePath: './proto.develop',
  // the output directory
  outputPath: 'src/graphql',
  // Optional. An array of proto-converter plugins
  plugins: [buildGql, buildInterface],
}
```

In `package.json`:

```js
{
  "scripts": {
    "convert": "proto-converter"
  }
}
```

then run with npm:

```sh
npm run convert
```

after that, you will anwser two questions:

```sh
# the proto path base on "sourcePath" of config, or absolute path
# for this one, it would be: /your-project-path/proto.develop/helloword/hi.proto
protoPath: helloword/hi.proto
# Optional. the "serviceName" would be the prefix of schema
# and the new fold name of new files to be location
serviceName: converter
```

for example:

```proto
syntax = "proto3";

service BuildRequest {
  // get proto config
  rpc GetConfig (GetConfigRequest) returns (GetConfigResponse) {
  }
}

message GetConfigRequest {
  string config_name = 1;
}

message GetConfigResponse {
  string name = 1;
  string path = 2;
}
```

the result of graphql schema:

```graphql
type Query {
  """
  get proto config
  """
  buildRequest_getConfig(req: GetConfigRequest): GetConfigResponse
}

type Converter_GetConfigRequest {
  config_name: String
}

type Converter_GetConfigResponse {
  name: String
  path: String
}
```

# Plugins

A plugin is a function which:

```typescript
type ConverterPlugin = (protoInfo: ProtoInfo) => void
```

about the `ProtoInfo`:

```typescript
interface ProtoInfo {
  root: protobuf.Root
  // the main proto object of current processing proto file
  proto: protobuf.Namespace
  // services in main proto
  services: protobuf.Service[] | null
  // all messages be used including nested\import messages
  messages: EnhancedReflectionObject[]
  config: Required<ConverterConfig>
}

type ConverterPlugin = (protoInfo: ProtoInfo) => void

interface EnhancedReflectionObject extends protobuf.ReflectionObject {
  // if the "type" is a request type
  isInput?: boolean
}

interface ConverterConfig {
  serviceName?: string
  // absolute path of current processing proto file
  protoPath: string
  sourcePath?: string
  outputPath?: string
  plugins?: ConverterPlugin[]
}
```

about the `Protobuf`, see [protobuf.js](https://protobufjs.github.io/protobuf.js/index.html)

# Configuration

The configuration file are optional, but it is convenient and thus recommended.

It is called `proto-converter.config.js` and sits in the root directory of your project.

```js
module.exports = {
  // optional. The directory contains proto files
  // defaults to the root directory of your project.
  sourcePath: './proto',
  // optional. The directory in which all generated files are placed.
  // defaults to the root directory of your project.
  outputPath: 'src/graphql',
  // optional. An array of proto-converter plugins
  plugins: [],
}
```

# Convention for proto

1. tag the required params if it requires for this request

```proto
message GetConfigResponse {
  // required
  string name = 1;
  string path = 2;
}
```

2. tag the map type, just for golang

```proto
message GetConfigResponse {
  // [ id, name ]
  map<string,string> scalar_map = 1;
}
```
