const path = require('path');
const fs = require('fs');

module.exports = function (plop) {
    const getNamespace = () => {
        // Get namespace from csproj file
        let files;
        let folder = plop.getDestBasePath();

        // Find csproj file
        do {
            files = fs.readdirSync(folder).filter(f => f.endsWith('.csproj'));
            folder = path.resolve(folder, '..');
        } while (files.length === 0 && !path.isAbsolute(folder))

        // Return csproj name as default namespace or Xrm if not found
        return files.length === 0 ? 'Xrm' : path.basename(files[0]).replace('.csproj', '');
    };

    const getTypes = () => {
        const destinationPath = plop.getDestBasePath();
        const configPath = path.resolve(destinationPath, 'dataverse.config.json');

        if (fs.existsSync(configPath)) {
            const file = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const types = file.types.map(t => t.name.substring(t.name.lastIndexOf('.') + 1));

            return types;
        }

        return [];
    };

    const getSteps = () => {
        const destinationPath = plop.getDestBasePath();
        const configPath = path.resolve(destinationPath, 'dataverse.config.json');

        if (fs.existsSync(configPath)) {
            const file = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const steps = [];

            file.types.forEach(t => {
                t.steps.forEach(s => steps.push(s.name));
            });

            return steps;
        }

        return [];
    };

    const stepPrompts = [
        {
            type: 'input',
            name: 'name',
            message: 'plugin step name',
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'input',
            name: 'message',
            message: 'message (Create, Update, etc)',
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'input',
            name: 'filteringattributes',
            message: 'filtering attributes as comma separated list:',
            when: (answers) => answers.message === 'Update' && answers.customApi !== true
        },
        {
            type: 'input',
            name: 'entity',
            message: 'entity logical name (use \'none\' if not for a specific entity)',
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'input',
            name: 'schema',
            message: 'entity schema name',
            when: (answers) => answers.entity !== 'none' && answers.customApi !== true
        },
        {
            type: 'input',
            name: 'secure',
            message: 'secure configuration',
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'input',
            name: 'unsecure',
            message: 'unsecure configuration',
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'input',
            name: 'description',
            message: 'description',
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'list',
            name: 'mode',
            message: 'mode',
            choices: [
                {
                    name: 'synchronous',
                    value: 0
                },
                {
                    name: 'asynchronous',
                    value: 1
                }
            ],
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'number',
            name: 'rank',
            message: 'step rank',
            default: 1,
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'list',
            name: 'stage',
            message: 'stage',
            choices: [
                {
                    name: 'pre-validation',
                    value: 10
                },
                {
                    name: 'pre-operation',
                    value: 20
                },
                {
                    name: 'post-operation',
                    value: 40
                }
            ],
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'list',
            name: 'supporteddeployment',
            message: 'deployment',
            default: 0,
            choices: [
                {
                    name: 'server only',
                    value: 0
                },
                {
                    name: 'microsoft dynamics 365 client for outlook only',
                    value: 1
                },
                {
                    name: 'both',
                    value: 2
                }
            ],
            when: (answers) => answers.customApi !== true
        },
        {
            type: 'confirm',
            name: 'addImage',
            message: 'include pre/post image',
            default: false,
            when: (answers) => answers.customApi !== true
        }
    ];

    const imagePrompts = [
        {
            type: 'list',
            name: 'imagetype',
            message: 'image type',
            choices: [
                {
                    name: 'pre-image',
                    value: 0
                },
                {
                    name: 'post-image',
                    value: 1
                },
                {
                    name: 'both',
                    value: 2
                }
            ],
            when: (answers) => (answers.addImage === undefined || answers.addImage === true) && answers.customApi !== true
        },
        {
            type: 'input',
            name: 'entityalias',
            message: 'name',
            when: (answers) => (answers.addImage === undefined || answers.addImage === true) && answers.customApi !== true
        },
        {
            type: 'input',
            name: 'imageattributes',
            message: 'comma separated list of attributes',
            when: (answers) => (answers.addImage === undefined || answers.addImage === true) && answers.customApi !== true
        }
    ];

    plop.setActionType('prepare', (answers) => {
        answers.namespace = getNamespace();

        switch (answers.stage) {
            case 10:
                answers.operation = 'PreValidation';
                break;
            case 20:
                answers.operation = 'PreOperation';
                break;
            case 40:
                answers.operation = 'PostOperation';
                break;
            default:
                answers.operation = 'MainOperation';
        }

        answers.stepMode = answers.customApi === true ? 'CustomAPI' : answers.mode === 0 ? 'Synchronous' : 'Asynchronous'
    });

    plop.setActionType('addToConfig', (answers, _config, plop) => {
        const destinationPath = plop.getDestBasePath();
        const configPath = path.resolve(destinationPath, 'dataverse.config.json');

        // Check if dataverse.config.json exists
        if (fs.existsSync(configPath)) {
            const file = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            if (file.types == null) {
                file.types = [];
            }

            // Get namespace
            const namespace = getNamespace();

            // Create plugin type config
            const type = {
                name: `${namespace}.${answers.filename}`,
                typename: `${namespace}.${answers.filename}`,
                friendlyname: answers.friendlyname || `${namespace}.${answers.filename}`,
                workflowactivitygroupname: answers.group,
                steps: []
            };

            // Add plugin step config
            if (answers.name !== undefined) {
                const step = {
                    name: answers.name,
                    message: answers.message,
                    entity: answers.entity,
                    configuration: answers.configuration,
                    description: answers.description,
                    mode: answers.mode,
                    rank: answers.rank,
                    stage: answers.stage,
                    supporteddeployment: answers.supporteddeployment,
                    filteringattributes: answers.filteringattributes,
                    images: []
                };

                // Add image if entered
                if (answers.addImage === true) {
                    step.images.push({
                        entityalias: answers.entityalias,
                        name: answers.entityalias,
                        imagetype: answers.imagetype,
                        attributes: answers.imageattributes,
                    });
                }

                type.steps.push(step);
            }

            file.types.push(type);

            // Update dataverse.config.json
            fs.writeFileSync(configPath, JSON.stringify(file, null, 4), 'utf8');

            return 'added to dataverse.config.json';
        } else {
            return `no dataverse.config.json found at ${destinationPath}`;
        }
    });

    plop.setActionType('addStepConfig', (answers, _config, plop) => {
        const destinationPath = plop.getDestBasePath();
        const configPath = path.resolve(destinationPath, 'dataverse.config.json');

        // Get dataverse.config.json if it exists
        if (fs.existsSync(configPath)) {
            const file = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // If no types property found, just run assembly addToConfig
            if (file.types == null) {
                addToConfig(answers);
                return;
            }

            const namespace = getNamespace();

            const type = file.types.filter(t => t.name === `${namespace}.${answers.filename}`);

            // If plugin type not already in file, run assembly addToConfig
            if (type.length === 0) {
                addToConfig(answers);
            } else {
                // Add step to existing config
                const step = {
                    name: answers.name,
                    message: answers.message,
                    entity: answers.entity,
                    configuration: answers.configuration,
                    description: answers.description,
                    mode: answers.mode,
                    rank: answers.rank,
                    stage: answers.stage,
                    supporteddeployment: answers.supporteddeployment,
                    filteringattributes: answers.filteringattributes,
                    images: []
                };

                // Add image if entered
                if (answers.addImage) {
                    step.images.push({
                        entityalias: answers.entityalias,
                        name: answers.entityalias,
                        imagetype: answers.imagetype,
                        attributes: answers.imageattributes
                    });
                }

                // Add step
                type[0].steps.push(step);
            }

            // Update file
            fs.writeFileSync(configPath, JSON.stringify(file, null, 4), 'utf8');
            return 'added to dataverse.config.json';
        } else {
            return `no dataverse.config.json found at ${destinationPath}`;
        }
    });

    plop.setActionType('addImage', (answers, _config, plop) => {
        const destinationPath = plop.getDestBasePath();
        const configPath = path.resolve(destinationPath, 'dataverse.config.json');

        // Get dataverse.config.json if it exists
        if (fs.existsSync(configPath)) {
            const file = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // If no types property found, just run assembly addToConfig
            if (file.types == null) {
                return 'add plugin types before adding images';
            }

            let step;

            file.types.forEach(t => {
                t.steps.forEach(s => {
                    if (s.name == answers.stepname) {
                        step = s;
                    }
                })
            });

            // If plugin step not already in file, prompt user to add step first
            if (step == null) {
                return 'add plugin step before adding images';
            } else {
                // Add image to existing step
                step.images.push({
                    entityalias: answers.entityalias,
                    name: answers.entityalias,
                    imagetype: answers.imagetype,
                    attributes: answers.imageattributes
                });
            }

            // Update file
            fs.writeFileSync(configPath, JSON.stringify(file, null, 4), 'utf8');
            return 'added to dataverse.config.json';
        } else {
            return `no dataverse.config.json found at ${destinationPath}`;
        }
    });

    plop.setGenerator('plugin', {
        prompts: [
            {
                type: 'input',
                name: 'filename',
                message: 'plugin class name'
            },
            {
                type: 'confirm',
                name: 'customApi',
                message: 'plugin for custom api',
                default: false
            },
            {
                type: 'input',
                name: 'message',
                message: 'custom api name',
                when: (answers) => answers.customApi === true
            },
            ...stepPrompts,
            ...imagePrompts
        ],
        actions: [
            {
                type: 'prepare'
            },
            {
                type: 'add',
                templateFile: 'plop-templates/plugin.cs.hbs',
                path: 'Plugins/{{filename}}.cs',
                skipIfExists: true
            },
            {
                type: 'add',
                templateFile: 'plop-templates/entity.cs.hbs',
                path: 'EntityExtensions/{{schema}}.cs',
                skipIfExists: true,
                skip: (data) => {
                    if (!data.entity || data.entity === 'none') {
                        return 'no entity entered';
                    } else {
                        return;
                    }
                }
            },
            {
                type: 'addToConfig'
            }
        ]
    });

    plop.setGenerator('workflow activity', {
        prompts: [
            {
                type: 'input',
                name: 'filename',
                message: 'workflow activity class name'
            },
            {
                type: 'input',
                name: 'friendlyname',
                message: 'friendly name'
            },
            {
                type: 'input',
                name: 'group',
                message: 'workflow activity group name'
            }
        ],
        actions: [
            {
                type: 'add',
                templateFile: 'plop-templates/workflow.cs.hbs',
                path: 'Activities/{{filename}}.cs',
                skipIfExists: true,
                data: { namespace: getNamespace() }
            },
            {
                type: 'addToConfig'
            }
        ]
    });

    plop.setGenerator('plugin step', {
        prompts: [
            {
                type: 'list',
                name: 'filename',
                message: 'plugin class name',
                choices: () => {
                    return getTypes();
                }
            },
            ...stepPrompts,
            ...imagePrompts
        ],
        actions: [
            {
                type: 'prepare'
            },
            {
                type: 'append',
                path: 'Plugins/{{filename}}.cs',
                pattern: /new RegisteredEvent\(.*\)/,
                template: 'new RegisteredEvent(PipelineStage.{{operation}}, SdkMessageProcessingStepMode.{{stepMode}}, "{{message}}", "{{entity}}")',
                separator: ',\n\t\t\t\t'
            },
            {
                type: 'add',
                templateFile: 'plop-templates/entity.cs.hbs',
                path: 'EntityExtensions/{{schema}}.cs',
                skipIfExists: true,
                skip: (data) => {
                    if (!data.entity || data.entity === 'none') {
                        return 'no entity entered';
                    } else {
                        return;
                    }
                }
            },
            {
                type: 'addStepConfig'
            }
        ]
    });

    plop.setGenerator('plugin step image', {
        prompts: [
            {
                type: 'list',
                name: 'stepname',
                message: 'plugin step name',
                choices: () => {
                    return getSteps();
                }
            },
            ...imagePrompts
        ],
        actions: [
            {
                type: 'addImage'
            }
        ]
    });
};
