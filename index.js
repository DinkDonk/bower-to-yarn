#!/usr/bin/env node

const {promisify} = require('util');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const chalk = require('chalk');
const yaml = require('js-yaml');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

let config;
let unpublishedPackages = {};

const {argv} = yargs
	.option('config', {
		alias: 'c',
		describe: 'The path to the config.yaml file',
		default: path.join(__dirname, 'config.yaml'),
		type: 'string'
	})
	.option('package-name-prefix', {
		alias: 'p',
		describe: 'String to inject as a prefix to the package name in package.json',
		type: 'string'
	})
	.option('bower-file', {
		alias: 'i',
		describe: 'The path to the bower.json file',
		default: './bower.json',
		type: 'string'
	})
	.option('package-file', {
		alias: 'o',
		describe: 'The path to the package.json file',
		default: './package.json',
		type: 'string'
	})
	.option('overwrite-duplicates', {
		alias: 'd',
		describe: 'If set to `true`, duplicate dependecies will resolve to the dependency defined in bower.json',
		default: false,
		type: 'boolean'
	})
	.normalize('config')
	.normalize('bower-file')
	.normalize('package-file')
	.help();

try {
	config = yaml.safeLoad(fs.readFileSync(argv.config, 'utf8'));
} catch (error) {
	displayError(error.message);
}

function displayMessage(category = '', message = '') {
	console.log(`${chalk.dim('[%s]')} ${chalk.green('➟')} %s`, category, message);
}

function displayWarning(message = '') {
	console.error(`${chalk.yellow('⚠  Warning ➟')}  ${message}`);
}

function displayError(message = '') {
	console.error(`${chalk.red('⚠  Error ➟')}  ${message}`);
}

readFile(argv.bowerFile, 'utf8')
.then((data) => {
	try {
		data = JSON.parse(data);
	} catch (error) {
		throw new Error(error);
	}

	if (!data.hasOwnProperty('dependencies')) {
		return {};
	}

	for (const key in config.packageResolves) {
		if (data.dependencies.hasOwnProperty(key)) {
			data.dependencies[config.packageResolves[key]] = data.dependencies[key];

			delete data.dependencies[key];
		}
	}

	// Clean up git@ urls (yarn doesn't like those)
	for (const key in data.dependencies) {
		if (data.dependencies[key].indexOf('git@') === 0) {
			data.dependencies[key] = 'git+ssh://' + data.dependencies[key];
		}

		if (data.dependencies[key].indexOf('git') === 0) {
			unpublishedPackages[key] = data.dependencies[key];
		}
	}

	return data.dependencies;
})
.then((bowerDependencies) => {
	return readFile(argv.packageFile, 'utf8')
	.then((data) => {
		try {
			data = JSON.parse(data);
		} catch (error) {
			throw new Error(error);
		}

		if (!data.hasOwnProperty('dependencies')) {
			data.dependencies = bowerDependencies;

			for (const key in bowerDependencies) {
				displayMessage('move-dep', `Moving dependency ${chalk.cyan(key)}`);
			}
		} else {
			for (const key in bowerDependencies) {
				if (!data.dependencies.hasOwnProperty(key) || (data.dependencies.hasOwnProperty(key) && config.overwriteDuplicates)) {
					displayMessage('move-dep', `Moving dependency ${chalk.cyan(key)}`);

					data.dependencies[key] = bowerDependencies[key];
				} else {
					displayMessage('move-dep', `Skipping duplicate dependency ${chalk.cyan(key)}`);
				}
			}
		}

		// Prepend name prefix if defined
		if (argv.packageNamePrefix && data.name.indexOf(argv.packageNamePrefix) !== 0) {
			data.name = argv.packageNamePrefix + data.name;
		}

		// Clean up git@ urls (yarn doesn't like those)
		if (data.hasOwnProperty('devDependencies')) {
			for (const key in data.devDependencies) {
				if (data.devDependencies[key].indexOf('git@') === 0) {
					data.devDependencies[key] = 'git+ssh://' + data.devDependencies[key];
				}

				if (data.devDependencies[key].indexOf('git') === 0) {
					unpublishedPackages[key] = data.devDependencies[key];
				}
			}
		}

		// Remove bower dependency (if presxent)
		if (data.hasOwnProperty('devDependencies')) {
			delete data.devDependencies.bower;
		}

		return writeFile(argv.packageFile, JSON.stringify(data, null, 2));
	});
})
.then(() => {
	displayMessage('clean-up', `Removing ${argv.bowerFile}`);

	return unlink(argv.bowerFile);
})
.then(() => {
	console.log('---');

	for (const key in unpublishedPackages) {
		displayWarning(`The ${chalk.cyan(key)} dependency is loaded from git. It should perhaps be published to a registry?`);
	}
})
.catch((error) => {
	displayError(error.message);
});