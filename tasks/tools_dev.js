/*
 * grunt-tools-dev
 * https://github.com/yanwsh/grunt-tools-dev
 *
 * Copyright (c) 2016 Wensheng Yan
 * Licensed under the MIT license.
 */

'use strict';

var request   = require('request'),
    _         = require('underscore'),
    jsonfile  = require('jsonfile'),
    inquirer  = require('inquirer'),
    Promise   = require('promise'),
    path      = require("path"),
    crypto    = require('crypto'),
    tools_api = require('./tools_api.js'),
    fs = require('fs'),
    async     = require("async");

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
    var createCampaign = grunt.option('create-campaign');
    var done = this.async();

    //get files info according to the settings.
    var files = [];
    this.files.forEach(function(file) {
      var cwd = file.cwd || '';
      files = files.concat(file.src.map(function(src) {
        var s = path.join(cwd, src);
        var filepath = src.substr(0, src.lastIndexOf('/') + 1);
        var filename_w_ext = src.replace(filepath, "");
        var filename = filename_w_ext.substr(0, filename_w_ext.lastIndexOf('.'));

        return {'path' : filepath, 'src':s, 'filename': filename, 'filenameWithExt': filename_w_ext};
      }));
    });

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
    var creative = {};

    function handle_error(err) {
      if(err){
	grunt.fail.warn("Error:" + err);
      }

      done();
      //get rid of other error message and prevent continue running.
      return Promise.reject(false);	
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
            default: "https://tools.complex.com/",
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
      if(createCampaign){
        //create a campaign
        grunt.verbose.writeln("creating campaign...");
        return new Promise(function (resolve, reject) {
          if(createCampaign === true){
            reject("You need to set a campaign name. Usuage --create-campaign=\"test-campaign\"");
          }
          tools_api.create_new_campaign(settings, createCampaign, function (error, result) {
             if(error){
               reject(error);
             }else{
               grunt.log.writeln("campaign name: " + createCampaign + " created on tools.");
               jsonfile.writeFileSync(campaignFile, result);
	           done();
             }
          });
        });
      }

      return settings;
    }, handle_error)
    .then(function (settings) {
      //get or set campaign file
      grunt.verbose.writeln("get or set campaign from file...");
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
        campaign = jsonfile.readFileSync(campaignFile);
        return campaign;
      }
    }, handle_error)
    .then(function (campaign) {
        //get creative list first
      grunt.verbose.writeln("getting creative list...");
      return new Promise(function (resolve, reject) {
        tools_api.get_creative_list(settings, campaign, function (error, result) {
          if(error){
            reject(error);
          }
          creative = result;
          resolve(creative);
        });
      });
    }, handle_error)
    .then(function (creatives) {
      grunt.verbose.writeln("compare creative and local files...");
      //get txt files from settings and compare with local files
      return new Promise(function (resolve, reject) {
        var tasks = [];
        files.forEach(function(f, index){
          var creative = _.chain(creatives)
                          .find(function(obj){
                            return obj.creative_name == f.filename;
                          })
                          .value();
          if(creative){
            var localcontent = fs.readFileSync(f.src,'utf8');
            var localmd5 = crypto.createHash('md5');
            localcontent = localcontent.replace(/\r/g, "");
            localmd5.update(localcontent);
            var localmd5Hash = localmd5.digest('hex');
            var remotemd5 = crypto.createHash('md5');
            remotemd5.update(creative.content);
            var remotemd5Hash = remotemd5.digest('hex');

            if(localmd5Hash == remotemd5Hash){
              grunt.log.writeln("skip " + f.src + ".");
            }else{
              creative.content = localcontent;
              tasks.push(function (callback) {
                tools_api.replace_files_to_campaign(settings, campaign, creative, function (error, result) {
                  if(error){
                    callback(error, null);
                  }else{
                    grunt.log.writeln("replace " + f.src + ".");
                    callback(null, result);
                    if (result.is_staging === true) {
                      grunt.log.writeln('\n-----------------------------------------------');
                      grunt.log.writeln(result.creative_name + " IS IN STAGING."["red"].bold);
                      grunt.log.writeln("PLEASE GO TO"["yellow"] + " tools.complex.com/" + result.campaign_id + " TO PUBLISH IT."["yellow"]);
                      grunt.log.writeln('-----------------------------------------------\n');
                    }
                  }
                });
              });
            }
          }else{
            tasks.push(function (callback) {
              tools_api.upload_files_to_campaign(settings, campaign,  f.src, function (error, result) {
                if(error){
                  callback(error, null);
                }
                grunt.log.writeln("upload " + f.src + ".");
                callback(null, result);
              });
            });
          }
        });
        async.parallel(tasks, function (err, results) {
          if(err){
            reject(err);
          }
          resolve(results);
        });
      });
    }, handle_error)
    .done(function () {
      grunt.verbose.ok("done.");
       done();
    }, handle_error);
  });

};
