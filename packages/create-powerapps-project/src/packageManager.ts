/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawnSync } from 'child_process';

export const install = (cwd: string, type: string, packageManager: string): void => {
  const packages = getPackages(type);

  if (process.env.JEST_WORKER_ID !== undefined) {
    return;
  }

  if (type === 'pcf') {
    spawnSync(packageManager, ['install']);
  } else {
    if (packageManager === 'yarn') {
      spawnSync(packageManager, ['add', ...packages.devDependencies], { stdio: 'inherit', cwd });

      if (packages.dependencies) {
        spawnSync(packageManager, ['add', ...packages.dependencies], { stdio: 'inherit', cwd });
      }
    }
  }
}

function getPackages(type: string) {
  const packages: { dependencies?: string[], devDependencies: string[] } = {
    devDependencies: [
      `powerapps-project-${type}`,
      'dataverse-utils'
    ]
  };

  if (type === 'webresource') {
    packages.devDependencies = [
      ...packages.devDependencies,
      '@types/xrm',
      'typescript',
      'eslint',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'webpack-event-plugin',
      'clean-webpack-plugin',
      'source-map-loader',
      'babel-loader',
      'ts-loader',
      '@babel/core',
      '@babel/preset-env',
      '@babel/preset-typescript',
      'xrm-mock',
      'webpack',
      'webpack-cli',
      'cross-spawn',
      'ts-node',
      '-D'
    ];

    packages.dependencies = ['core-js', 'regenerator-runtime', 'powerapps-common', 'dataverse-webapi'];
  }

  return packages;
}