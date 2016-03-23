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
    var campaign = {};

    function handle_error(err) {
      if(err)
        grunt.fail.warn("Error: " + err);
      done();
    }

    new Promise(function (resolve, reject) {
      //get or set config file
      if(!grunt.file.exists(configFile)){
        grunt.log.errorlns("Missing tools dev config file.");

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
            reject(false);
          }else{
            settings = {
              url: answer.toolsURL,
              token: answer.token
            };
            jsonfile.writeFileSync(configFile, settings);
            resolve(settings);
          }
        });
      }else{
        settings = jsonfile.readFileSync(configFile);
        resolve(settings);
      }
    }).then(function (settings) {
      //get or set campaign file
      if(!grunt.file.exists(campaignFile)){
        return new Promise(function (resolve, reject) {
          inquirer.prompt([
            {
              type: "confirm",
              name: "isSetting",
              message: "You didn't bind any campaign. Do you want to bind a campaign?",
              default: true
            }
          ], function (answer) {
            if(!answer.isSetting){
              reject(false);
            }
            resolve(answer.isSetting);
          });
        }).then(function () {
          return new Promise(function (resolve, reject) {
            async.retry(3,
                function (callback, result) {
                  inquirer.prompt([
                    {
                      type: "input",
                      name: "campaignId",
                      message: "Please input campaign id: "
                    }
                  ], function (answer) {
                    var link = 'api/campaigns/' + answer.campaignId;
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
                    request(options, function (error, response, body) {
                      if(error){
                        callback(error, null);
                      }
                      try{
                        var obj = JSON.parse(body);
                        var error;
                        if(obj.errors){
                          error = obj.errors.message;
                          grunt.log.errorlns("Error:" + error);
                        }
                        callback(error, obj);
                      }
                      catch(e){
                        callback(error, null);
                      }
                    });
                  });
                },
                function (err, result) {
                  if(err) reject(err);
                  campaign = result;
                  jsonfile.writeFileSync(campaignFile, campaign);
                  resolve(campaign);
                }
            );
          });
        });
      }else{
        return jsonfile.readFileSync(campaignFile);
      }
    }, handle_error)
    .done(function (campaign) {
      console.log(campaign);
       done();
    }, handle_error);



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
