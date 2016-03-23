/*
 * grunt-tools-dev
 * https://github.com/yanwsh/grunt-tools-dev
 *
 * Copyright (c) 2016 Wensheng Yan
 * Licensed under the MIT license.
 */

'use strict';

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    release: {
      options: {
        npm: true,
        npmtag: false,
        indentation: '\t',
        tagName: 'v<%= version %>'
      }
    },

    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    // Configuration to be run (and then tested).
    tools_dev: {
      options: {
        configFile: getUserHome() + '/.tools.json',
        campaignFile: 'campaign.json'
      },
      txt: {
        src: ['_public/**/*.txt']
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-release');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  //grunt.registerTask('test', ['clean', 'tools_dev', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'dev']);

  grunt.registerTask('dev', ['tools_dev']);

};
