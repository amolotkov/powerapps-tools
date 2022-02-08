import fs from 'fs';
import path from 'path';
import { PluginAssembly, deploy } from './models/pluginAssembly';
import { DeployCredentials } from './dataverse.service';
import { WebApiConfig } from 'dataverse-webapi/lib/node';
import { logger } from './logger';

export async function deployAssembly(creds: DeployCredentials, apiConfig: WebApiConfig): Promise<void> {
  const currentPath = '.';
  const configFile = fs.readFileSync(path.resolve(currentPath, 'dataverse.config.json'), 'utf8');

  if (configFile == null) {
    logger.warn('unable to find dataverse.config.json file');
    return;
  }

  const config: PluginAssembly = JSON.parse(configFile);

  logger.info('deploy assembly');

  try {
    await deploy(config, apiConfig, creds.solution);
  } catch (error: any) {
    logger.error(error.message);
    return;
  }

  logger.done(`deployed assembly ${config.name}\r\n`)
}