# grunt-tools-dev

> automation tools for tools.complex.com

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-tools-dev --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-tools-dev');
```

## Get you own private token
Before start this program, please go to [token page](https://tools.complex.dev/users/token) and get your own private token.

## The "tools_dev" task

### Overview
In your project's Gruntfile, add a section named `tools_dev` to the data object passed into `grunt.initConfig()`.

the config file will be stored on user's home directory, so you don't have to input your private token again.

```js
function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

grunt.initConfig({
  tools_dev: {
    options: {
        configFile: getUserHome() + '/.tools.json',
        campaignFile: 'campaign.json'
    },
    your_target: {
      src: ['_public/**/*.txt']
    },
  },
});
```

### Options

#### options.configFile
Type: `String`
Default value: `'.tools.json'`

A string value that is the file path for tools configuration file. This file is used to store url and private token for [https://tools.complex.com](http://tools.complex.com). If this file is missing, a diglog will be prompted to help you create one.

#### options.campaignFile
Type: `String`
Default value: `'campaign.json'`

A string value that is the file path for storing the detail of current manulipate campaign. If this file is missing, it will run a dialog to help you create one.

### Usage Examples

#### Default Options
In this example, the default options are used. So `.tools.json` and `campaign.json` file will be stored on current directory. The program will check all txt files inside `_public` directory, compare the txt file name with the file name in tools base on the campaign info store in `campaign.json` file. If the file name is not in remote, it will create a new txt file in tools. If it has, the program will compare the md5 digit hash. If hash value is not same, it will replace remote txt file with your local version.

```js
grunt.initConfig({
  tools_dev: {
    options: {},
    txt: {
      src: ['_public/**/*.txt']
    },
  },
});
```

#### Custom Options
In this example, you can custom your own storing path and file name. It will only mangae the creatives for fwbb.
```js
grunt.initConfig({
  tools_dev: {
    options: {
        configFile: getUserHome() + '/.tools.json',
        campaignFile: 'campaign.json'
    },
    files: {
      src: ['_public/fwbb-static/*.txt'],
    },
  },
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
0.1.0 Initial Version
