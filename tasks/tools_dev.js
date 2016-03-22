/*
 * grunt-tools-dev
 * https://github.com/yanwsh/grunt-tools-dev
 *
 * Copyright (c) 2016 Wensheng Yan
 * Licensed under the MIT license.
 */

'use strict';

var request  = require('request'),
    _        = require('underscore'),
    jsonfile = require('jsonfile'),
    inquirer = require('inquirer'),
    Promise  = require('promise'),
    async    = require("async");

var DEFAULT_CONFIG_FILE = ".tools.json";

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('tools_dev', 'automation tools for tools.complex.com', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      configFile: DEFAULT_CONFIG_FILE,
      campaignFile: 'campaign.json'
    });

    var configFile = options.configFile;
    var campaignFile = options.campaignFile;
    var done = this.async();

    function needSetting(){
      return function (answers) {
        return answers['isSetting'];
      }
    }

    function isNormalInteger(str) {
      var n = ~~Number(str);
      return String(n) === str && n >= 0;
    }

    var settings = {};

    if(!grunt.file.exists(configFile)){
      grunt.verbose.write("Missing tools dev config file.");

      inquirer.prompt([
        {
          type: "confirm",
          name: "isSetting",
          message: "Do you want to set it up right now?",
          default: true
        },
        {
          type: "input",
          name: "toolsURL",
          message: "Please input tools url link.",
          default: "http://tools.complex.com/",
          when: needSetting()
        },
        {
          type: "input",
          name: "token",
          message: function(answer){
            return "please input your token for " + answer["toolsURL"] + "."
          },
          when: needSetting(),
          validate: function (input) {
            var key = new Buffer(input, 'base64').toString('ascii');
            var error_message = "The token which you provide is not valid. Please try again.";

            var index = key.indexOf('.');
            if(index <= 0){
              return false;
            }
            var id = key.substring(0, index);
            var realkey = key.substring(index + 1);
            var result = (isNormalInteger(id) && realkey.length == 16)? true : error_message;
            return result;
          }
        }
      ], function(answer){
        if(!answer.isSetting){
          done();
        }else{
          settings = {
            url: answer.toolsURL,
            token: answer.token
          };
          jsonfile.writeFileSync(configFile, settings);
        }
      });
    }else{
      settings = jsonfile.readFileSync(configFile);
    }
    
    function question_campaign_id() {
      return new Promise(function(fulfill, reject){
        inquirer.prompt([
          {
            type: "input",
            name: "campaignId",
            message: "Please input campaign id."
          }
        ], function (answer) {
          fulfill(answer.campaignId);
        });
      });
    }

    var campaign = {};
    if(!grunt.file.exists(campaignFile)){
      inquirer.prompt([
        {
          type: "confirm",
          name: "isSetting",
          message: "You didn't bind any campaign right now. Do you want to bind a campaign?",
          default: true
        }
      ], function (answer) {
        if(!answer.isSetting){
          done();
        }else{
          question_campaign_id()
          .then(function (id) {
            console.log("id: " +id);
            var link = 'campaigns/' + id;
            var options = {
              method: 'GET',
              url: link,
              baseUrl: settings.url,
              jar: true,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'auth-token': settings.token
              }
            };
             return new Promise(function (fulfill, reject) {
               request(options, function (error, response, body) {
                 if(error){
                   reject(error);
                 }
                 try{
                   fulfill(JSON.parse(body));
                 }
                 catch(e){
                   reject(error);
                 }
               });
             });
          })
          .then(function (data) {
            console.log(data);
            done();
          })
          .catch(function (data) {
            grunt.fail.warn("Something wrong, Error message: " + data);
            done();
          });
        }
      });
    }


/*
    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      // Concat specified files.
      var src = f.src.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function(filepath) {
        // Read file source.
        return grunt.file.read(filepath);
      }).join(grunt.util.normalizelf(options.separator));

      // Handle options.
      src += options.punctuation;

      // Write the destination file.
      grunt.file.write(f.dest, src);

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });
    */
  });

};
