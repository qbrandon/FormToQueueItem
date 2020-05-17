'use strict';

//native
var crypto = require('crypto');
// modules
var Orchestrator = require('uipath-orchestrator');

// constants
var SIGNATURE_HEADER = 'x-custom-signature';

// configuration constants
var USER_KEY = process.env.USER_KEY;
var ACCOUNT_LOGICAL_NAME = process.env.ACCOUNT_LOGICAL_NAME;
var TENANT_LOGICAL_NAME = process.env.TENANT_LOGICAL_NAME;
var CLIENT_ID = process.env.CLIENT_ID;
var FOLDER_ID = process.env.FOLDER_ID;
var QUEUE_NAME = process.env.QUEUE_NAME;
var SIGNATURE_SECRET = process.env.SIGNATURE_SECRET;

/** @type {Orchestrator} */
var cloudOrchestrator = new Orchestrator({
    clientId: CLIENT_ID,
    refreshToken: USER_KEY,
    serviceInstanceLogicalName: TENANT_LOGICAL_NAME,
    path: ACCOUNT_LOGICAL_NAME + '/' + TENANT_LOGICAL_NAME
});

cloudOrchestrator.switchOrganizationUnitId(FOLDER_ID);

/**
 * @param {GCPResponse} res
 * @param {string} msg
 * @param {number} [code]
 */
function handleError(res, msg, code) {
    res.status(code || 500).send(msg).end();
}

/**
 * @param {string} signature
 * @param {string} payload
 * @returns {boolean}
 */
function checkSignature(signature, payload) {
    var expected = crypto.createHmac('sha256', SIGNATURE_SECRET).update(payload.toString()).digest('base64');
    return signature === expected;
}

/**
 * @param {IncomingFormRequest} req
 * @param {GCPResponse} res
 */
module.exports.IncomingFormSubmissionHandler = function (req, res) {
    var i, len;
    /** @type {Object.<string, string>} */
    var payload = {};
    /** @type {{title: string, response}} */
    var responseItem;
    /** @type {Object} */
    var queueItem;

    if (!req.body) {
        return handleError(res, 'Invalid payload', 400);
    }
    if (!checkSignature(req.headers[SIGNATURE_HEADER], req.rawBody)) {
        return handleError(res, 'Bad signature', 401);
    }

    payload.submitter = req.body.submitter;
    len = req.body.responses.length;
    for (i = 0; i < len; i += 1) {
        responseItem = req.body.responses[i];
        if (responseItem.title !== 'submitter') {
            if (typeof responseItem.response === 'string') {
                payload[responseItem.title] = responseItem.response;
            } else {
                // let's handle non-string type of responses gracefully
                // (Orchestrator does not accept non-basic types in the SpecificContent of QueueItems)
                payload[responseItem.title] = JSON.stringify(responseItem.response);
            }
        }
    }
    // Let's also include the stringified raw data as part of the payload
    payload.rawData = JSON.stringify(req.body.responses);

    queueItem = {itemData: {
        Name: QUEUE_NAME,
        SpecificContent: Orchestrator.odataHelper.annotateStrings(payload)
    }};
    cloudOrchestrator.v2.odata.postAddQueueItem(
        queueItem,
        function (err) {
            if (err) {
                console.error(err.message);
                handleError(res, 'Failed to submit data');
            } else {
                res.end();
            }
        }
    );
};

/**
 * @typedef {Express.Request} GCPRequest
 * @property {Object.<string>} headers
 * @property {string} rawBody
 */

/**
 * @typedef {GCPRequest} IncomingFormRequest
 * @property {{submitter: string, responses: Array.<{title: string, response}>}} body
 */

/**
 * @typedef {Response<Object>} GCPResponse
 */
