import fs from 'fs';
import path from 'path';
import { logger } from 'just-scripts-utils';
import { DeployCredentials, getTableMetadata, TableMetadata } from './dataverse.service';
import { WebApiConfig } from 'dataverse-webapi/lib/node';
import { getTokenFromCache } from './tokenCache';

export default async function generate(table: string): Promise<void> {
  const currentPath = '.';
  const credsFile = fs.readFileSync(path.resolve(currentPath, 'dataverse.config.json'), 'utf8');

  if (credsFile == null) {
    logger.warn('unable to find dataverse.config.json file');
    return;
  }

  const creds: DeployCredentials = JSON.parse(credsFile).connection;

  const token = getTokenFromCache(creds.server);

  if (!token.accessToken) {
    logger.error('use dataverse-utils auth command to get access token before deploying');
    return;
  }

  const apiConfig = new WebApiConfig('8.2', token.accessToken, creds.server);

  let metadata: TableMetadata = {} as TableMetadata;

  logger.info('Retrieve table metadata');

  try {
    metadata = await getTableMetadata(table, apiConfig);
  } catch (error) {
    logger.error(error.message);
    return;
  }

  // Build code file from metadata
  const codeFile = [
    `class ${metadata.schemaName} {`,
    '\r\n',
    `  LogicalName = '${metadata.logicalName}';`,
    '\r\n',
    `  SchemaName = '${metadata.schemaName}';`,
    '\r\n',
    `  EntitySetName = '${metadata.entitySetName}';`,
    '\r\n',
    '\r\n',
    '  Fields = {',
    '\r\n',
    metadata.fields.map(f => {
      return `    '${f.schemaName}': '${f.logicalName}'`;
    }).join(',\r\n'),
    '\r\n',
    '  }',
    '\r\n',
    '\r\n',
    metadata.choices.map(c => {
      const field = metadata.fields.find(f => f.logicalName === c.column);

      return `  ${field?.schemaName ?? c.column} = ${metadata.schemaName}_${field?.schemaName ?? c.column};`;
    }).join('\r\n'),
    '\r\n',
    '}',
    '\r\n',
    '\r\n',
    metadata.choices.map(c => {
      const field = metadata.fields.find(f => f.logicalName === c.column);

      return [
        `export enum ${metadata.schemaName}_${field?.schemaName ?? c.column} {`,
        '\r\n',
        c.options.map(x => `  '${x.text.replace(`'`, `\\'`)}' = ${x.value}`).join(',\r\n'),
        '\r\n',
        '}'
      ].join('')
    }).join('\r\n\r\n'),
    '\r\n',
    '\r\n',
    `export default new ${metadata.schemaName}();`
  ].join('');

  if (!fs.existsSync(path.resolve(currentPath, 'src', 'scripts', 'models'))) {
    fs.mkdirSync(path.resolve(currentPath, 'src', 'scripts', 'models'));
  }

  fs.writeFileSync(path.resolve(currentPath, 'src', 'scripts', 'models', `${metadata.schemaName}.ts`), codeFile);

  logger.info(`Table metadata output to models/${metadata.schemaName}.ts`);
}