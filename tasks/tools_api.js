(function () {
    'use strict';

    var request   = require('request'),
        fs = require('fs'),
        _ = require('underscore');

    function result_export(cb){
        return function(error, response, body) {
            var result = JSON.parse(body);
            if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
                cb(null, result);
            } else {
                var error_message = (result.errors)? result.errors.message: error || body;
                cb(error_message, null);
            }
        }
    }

    module.exports = {
        create_new_campaign : function($settings, $campaign_name, cb) {
            var api_link, options;
            api_link = "/api/campaigns";
            options = {
                method: 'POST',
                url: api_link,
                baseUrl: $settings.url,
                jar: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'auth-token': $settings.token
                },
                formData: {
                    'campaign_name': $campaign_name
                }
            };
            request(options, result_export(cb));
        },

        get_creative_list : function($settings, $campaign, cb) {
            var api_link, options;
            api_link = "/api/campaigns/" + $campaign.id + "/creatives";
            options = {
                method: 'GET',
                url: api_link,
                baseUrl: $settings.url,
                jar: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'auth-token': $settings.token
                }
            };
            request(options, result_export(cb));
        },

        upload_files_to_campaign : function($settings, $campaign, filename, cb) {
            var api_link, form, options;
            api_link = "/api/campaigns/" + $campaign.id + "/creatives";
            options = {
                method: 'POST',
                url: api_link,
                baseUrl: $settings.url,
                jar: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'auth-token': $settings.token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            var req = request(options, result_export(cb));
            form = req.form();
            form.append('file', fs.createReadStream(filename));
        },

        replace_files_to_campaign : function($settings, $campaign, $creative, cb) {
            var api_link, options;
            api_link = "/api/creatives/" + $creative.id;
            options = {
                method: 'PUT',
                url: api_link,
                baseUrl: $settings.url,
                jar: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest',
                    'auth-token': $settings.token
                },
                json: {
                    creative_name: $creative.creative_name,
                    content: $creative.content,
                    campaign_id: $campaign.id,
                    approval_status: 0
                }
            };
            request(options, function(error, response, body) {
                var result = body;
                if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
                    cb(null, result);
                } else {
                    var error_message = (result.errors)? result.errors.message: error || JSON.stringify(body);
                    cb(error_message, null);
                }
            });
        }
    }
}).call(this);