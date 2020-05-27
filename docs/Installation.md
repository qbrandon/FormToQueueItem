# Setup instuctions

Because the data is cascading from the form submission event down to the workflow, we need to setup the various configuration dependencies going upstream.  
As a result, we will start by configuring the process first, and finish with the form's Apps Script.

## Deploy the UiPath package

Open the `InternetSubscription` UiPath Studio project inside the `workflow` folder.  
Optionnaly, feel free to customize the `processItem.xaml` at will.  
When done, publish the package to Orchestrator.

In Orchestrator:
* define a Process using this Package
* create a Queue named `Subscriptions` (consistently with the queue name used in the Main.xaml)
* Create a Trigger of type Queue, and select the `InternetSubscription` Process the you defined, along with the `Subscriptions` queue you just created (you may fine tune the Max number of pending jobs and other parameters later)

How to setup an Unattended Robot is out of the scope of this project, so please refer to the [UiPath documentation](https://docs.uipath.com/) if need be.

If your Orchestrator instance is self hosted, then you will be able to define a user with the right permission (e.g. Queue Item creation.)  
If you wish to use the [UiPath Automation Cloud](https://cloud.uipath.com) then you can refer to the following guide on how to [configure API access](https://docs.uipath.com/automation-cloud/docs/about-api-access) for the next step.  
In the following steps, will assume the use of Automation Cloud.

In preparation of the next section, we want to get the API Access information as mentioned in the documentation above, more specifically:
* User Key (also called a "refresh token", this is the secret key to your account, treat with extreme care)
* Account Logical Name
* Tenant Logical Name
* Client Id

Next, you need to get the ID of the Orchestrator Folder where the Process and Queue are defined.  
There are several ways, both of which require you to log into your Orchestrator service, then:
* use your browser's development tool to inspect the Folder ID used in the request headers
* access the following URL and get the ID from the results: `https://cloud.uipath.com/<AccountLogicalName>/<TenantLogicalName>/odata/Folders`  
Where you would replace the AccountLogicalName and TenantLogicalName with the values from the previous paragraph.  
The FolderId is an Interger.

## Deploy the Google Cloud Functions instance

In your Google Cloud project console, navigate to the `Cloud Functions` tab and click the `CREATE FUNCTION` button.

We will use the default trigger type which is HTTP.  
Please not the URL as will need it in the next section (`GCF_URL`.)  
We will not fiddle with GCP specific authentication mechanism, so check the `Allow unauthenticated invocations` option.

You may simply use the `Inline editor`, select the Node.js Runtime (8 or 10 should both be compatible,) and copy/paste the following:
* INDEX.JS: the content of [function/index.js](../function/index.js)
* PACKAGE.JSON: the content of [function/package.json](../function/package.json)

The `Function to execute` must be set to `IncomingFormSubmissionHandler`

Expand the `Environment variables, networking, timeouts and more` section and add the following `Environment variables` (again, assuming the use of UiPath Automation Cloud):
* `USER_KEY`: <the `User Key` mentioned in the section above>
* `ACCOUNT_LOGICAL_NAME`: <the `Account Logical Name` mentioned in the section above>
* `TENANT_LOGICAL_NAME`: <the `Tenant Logical Name` mentioned in the section above>
* `CLIENT_ID`: <the `Client Id` mentioned in the section above>
* `FOLDER_ID`: <the `Folder ID mentioned in the section above`>
* `QUEUE_NAME`: `Subscriptions`
* `SIGNATURE_SECRET`: <a custom, string type, secret key>

You will need to re-use the `SIGNATURE_SECRET` in the following step, as it will basically ensure the legitimacy of incoming data.  
An decent key would be as random as possible and 64 character-long for example.

Now click the `CREATE` button so your function is deployed and ready.

## Create your Google Form

This is where things become a bit more creative.  
In my tests, I had a form with the following fields:
* `Email address` ("Collect email addresses" configuration)
* `First name` (Short answer, Required)
* `Last name` (Short answer, Required)
* `Address` (Pragraph, Required)
* `Phone number` (Short answer, Required)
* `Subscription type` (Multiple choice, Required)
* `Desired setup date` (Date)
* `Comments` (Paragraph)

The sample workflow is assuming the presence of the `Email address` as the key `submitter` due to the form being configured with the setting "Collect email addresses", and the function enforcing the submitter be part of the payload.
Please note that each item in the workflow will be represented as a basic type, so complex types (e.g. the results of a Checkboxes question) will be included in the resulting Queue Item as a string representation (JSON) of the response.

Once you are satisfied with the content of your form, you can open the top right menu and select `<> Script editor` to access the Apps Script editor.  
In the `Code.gs` file that is now being edited, you may copy paste the content of the [script/submit.gs](../script/submit.gs) file.  
Then click the `File` menu and open the `Project Properties`.  
In the `Script properties` tab, you will define 2 values:
* `SIGNATURE_SECRET`
* `GCF_URL`

Click `Save` and you are almost there!

In the Edit menu, open `Current Project's Triggers`.
Click `Add Trigger` then set the following entries:
- "Which function to run": `onFormSubmit`
- "Event type": `On form submit`

The rest should be left as default (deployment `Head`, and source `Form`)

Click `Save` and you are finally ready to go!