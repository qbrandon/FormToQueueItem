// constants
var SIGNATURE_HEADER = 'x-custom-signature';

// configuration constants
var GCF_URL = PropertiesService.getScriptProperties().getProperty('GCF_URL');
var SIGNATURE_SECRET = PropertiesService.getScriptProperties().getProperty('SIGNATURE_SECRET');

FormApp.getActiveForm();

/**
 * @param {Array.<GoogleAppsScript.Forms.ItemResponse>} items
 * @returns {Array<{title: string, response: (string|Array<string>|Array<Array<string>>)}>}
 */
function extractResponses(items) {
    'use strict';
    var i, len;
    /** @type {GoogleAppsScript.Forms.ItemResponse} */
    var item;
    /** @type {Array.<{title: string, response: string|Array.<string>|Array.<Array.<string>>}>} */
    var result = [];

    len = items.length;
    for (i = 0; i < len; i += 1) {
        item = items[i];
        result.push({
            title: item.getItem().getTitle(),
            response: item.getResponse()
        });
    }
    return result;
}

/**
 * @param {string} payload
 * @returns {string}
 */
function sign(payload) {
    'use strict';
    return Utilities.base64Encode(Utilities.computeHmacSha256Signature(payload, SIGNATURE_SECRET));
}

/**
 * @param {Object} data
 * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse}
 */
function postData(data) {
    'use strict';
    /** @type {Object.<string>} */
    var headers = {};
    /** @type {Object} */
    var params;
    /** @type {string} */
    var payload = JSON.stringify(data);

    headers[SIGNATURE_HEADER] = sign(payload);
    params = {
        method: 'post',
        contentType: 'application/json',
        payload: payload,
        headers: headers
    };
    // https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app#fetchurl,-params
    return UrlFetchApp.fetch(GCF_URL, params);
}

// JSUnusedGlobalSymbols
/**
 * @param {{response: FormResponse}} e
 * https://developers.google.com/apps-script/guides/triggers/events#google_forms_events
 */
function onFormSubmit(e) {
    'use strict';
    /** @type {string} */
    var submitter = e.response.getRespondentEmail();
    /** @type {Array.<Object>} */
    var responses = extractResponses(e.response.getItemResponses());
    /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */
    var httpResponse = postData({
        submitter: submitter,
        responses: responses
    });
    /** @type {number} */
    var statusCode = httpResponse.getResponseCode();

    if (statusCode >= 400) {
        console.error(httpResponse.getContentText());
    }
}
