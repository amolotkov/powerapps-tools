import { addToSolution, ComponentType, publish } from "../powerapps.service";
import { retrieveMultiple, createWithReturnData, update } from "xrm-webapi/dist/webapi-node";
import { parseGuid, WebApiConfig } from "xrm-webapi/dist/models";
import { logger } from 'just-scripts-utils';
import fs from 'fs';

export interface WebResource {
  displayname: string;
  name: string;
  type: string;
  content: string;
  path: string;
  webresourcetype: number;
}

function getWebResourceType(type: string): number {
  switch (type) {
    case "HTML":
      return 1;
    case "CSS":
      return 2;
    default:
    case "JavaScript":
      return 3;
    case "XML":
      return 4;
    case "PNG":
      return 5;
    case "JPG":
      return 6;
    case "GIF":
      return 7;
    case "XAP":
      return 8;
    case "XSL":
      return 9;
    case "ICO":
      return 10;
    case "SVG":
      return 11;
    case "RESX":
      return 12;
  }
}

export async function deploy(resources: WebResource[], apiConfig: WebApiConfig, solution?: string, files?: string): Promise<void> {
  const publishXml: string[] = [];

  // Use list of files if provided
  if (files) {
    resources = [];

    files
      .split(',')
      .forEach(file => {
        const resource = resources.filter(r => r.path?.endsWith(file));

        if (resource.length === 0) {
          logger.error(`web resource ${file} not found in config.json`);
        } else {
          resources.push(resource[0]);
        }
      });
  }

  const promises = resources.map(async resource => {
    let resourceId = await retrieveResource(resource.name, apiConfig);

    const fileContent = fs.readFileSync(resource.path, 'utf8');
    const content = Buffer.from(fileContent).toString("base64");

    if (resourceId) {
      try {
        const updated = await updateResource(resourceId, resource, content, apiConfig);

        publishXml.push(updated);
      } catch (error) {
        logger.error(`failed to update resource: ${error.message}`);
      }
    } else {
      try {
        resourceId = await createResource(resource, content, apiConfig);
      } catch (error) {
        logger.error(`failed to create resource: ${error.message}`);
      }

      if (solution != undefined) {
        try {
          await addToSolution(resourceId, solution, ComponentType.WebResource, apiConfig)
        } catch (error) {
          logger.error(`failed to add to solution: ${error.message}`);
        }
      }
    }
  });

  await Promise.all(promises);

  // publish resources
  if (publishXml.length > 0) {
    try {
      await publish(publishXml.join(''), apiConfig);
    } catch (error) {
      logger.error(error.message);
      return;
    }
  }
}

async function retrieveResource(name: string, apiConfig: WebApiConfig): Promise<string> {
  const options: string = `$select=webresourceid&$filter=name eq '${name}'`;

  const result = await retrieveMultiple(apiConfig, "webresourceset", options);

  return result.value.length > 0 ? result.value[0].webresourceid : undefined;
}

async function createResource(resource: WebResource, content: string, apiConfig: WebApiConfig): Promise<string> {
  logger.info(`create web resource ${resource.name}`);

  const webResource = {
    webresourcetype: getWebResourceType(resource.type),
    name: resource.name,
    displayname: resource.displayname || resource.name,
    content: content
  };

  const result = await createWithReturnData(apiConfig, "webresourceset", webResource, "$select=webresourceid");

  return result.webresourceid;
}

async function updateResource(id: string, resource: WebResource, content: string, apiConfig: WebApiConfig) {
  logger.info(`update web resource ${resource.name}`);

  const webResource = {
    content: content
  };

  await update(apiConfig, "webresourceset", parseGuid(id), webResource);

  return `<webresource>{${id}}</webresource>`;
}