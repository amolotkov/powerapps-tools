# powerapps-common
|NPM|
|---|
|[![npm](https://img.shields.io/npm/v/powerapps-common.svg?style=flat-square)](https://www.npmjs.com/package/powerapps-common)|

A Dataverse module including common functions used in JavaScript web resource development.

### Installation

##### Node

```
npm install powerapps-common
```
### Usage

Import the module into your TypeScript/JavaScript files

```typescript
import { setFieldRequirementLevel } from 'powerapps-common';

setFieldRequirementLevel('accountnumber', 'required');
```

For Dynamics versions less than 9.0

```typescript
import { setFieldRequirementLevel } from 'powerapps-common\dist\v8\index';

setFieldRequirementLevel('accountnumber', 'required');
```
