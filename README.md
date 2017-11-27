Bower to yarn
=============

A simple tool for moving bower dependencies to yarn or npm.  
Made for my own special use-case. Maybe it will help you to? :tada:

---

### Installation

```bash
$ yarn global add bower-to-yarn
```

### Usage

In the root of your chosen project:

```bash
$ bower-to-yarn
```

### Options

| Option    | Description | Default |
| :-------- |:------------| :-------|
| --version | Show version number |  |
| --help | Show help |  |
| --config, -c | The path to the `config.yaml` file |  |
| --package-name-prefix, -p | String to inject as a prefix to the package name in package.json |  |
| --bower-file, -i | The path to the bower.json file | `./bower.json` |
| --package-file, -o | The path to the package.json file | `./package.json` |
| --overwrite-duplicates | If set to `true`, duplicate dependecies will resolve to the dependency defined in bower.json | `false` |