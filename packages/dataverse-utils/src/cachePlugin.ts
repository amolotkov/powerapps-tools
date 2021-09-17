import { ICachePlugin, TokenCacheContext } from '@azure/msal-node';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Cryptr from 'cryptr';

const algorithm = 'aes-256-ctr';

const encrypt = (text: string) => {
  const user = os.userInfo().username;
  const cryptr = new Cryptr(user);

  const encrypted = cryptr.encrypt(text);

  return encrypted;
};

const decrypt = (text: string) => {
  const user = os.userInfo().username;
  const cryptr = new Cryptr(user);

  const decrypted = cryptr.decrypt(text);

  return decrypted;
};

export function cachePlugin(org: string): ICachePlugin {
  const getCachePath = () => {
    if (!fs.existsSync(path.join(os.homedir(), './.dataverse-utils/'))) {
      fs.mkdirSync(path.join(os.homedir(), './.dataverse-utils/'));
    }

    return path.join(os.homedir(), `./.dataverse-utils/${org}.json`);
  };

  const cacheLocation = getCachePath();

  const beforeCacheAccess = (tokenCacheContext: TokenCacheContext): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(cacheLocation)) {
        fs.readFile(cacheLocation, 'utf-8', (err, data) => {
          if (err) {
            reject();
          } else {
            const decrypted = decrypt(data);

            tokenCacheContext.tokenCache.deserialize(decrypted);
            resolve();
          }
        });
      } else {
        const encrypted = encrypt(tokenCacheContext.tokenCache.serialize());

        fs.writeFile(cacheLocation, encrypted, (err) => {
          if (err) {
            reject();
          } else {
            resolve();
          }
        });
      }
    });
  };

  const afterCacheAccess = (tokenCacheContext: TokenCacheContext): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (tokenCacheContext.cacheHasChanged) {
        const encrypted = encrypt(tokenCacheContext.tokenCache.serialize());

        fs.writeFile(cacheLocation, encrypted, (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  return {
    beforeCacheAccess,
    afterCacheAccess
  };
}