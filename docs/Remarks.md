# Remarks about the design and implementation choices

## Architecture

RPA is a very powerful form of automation, but just like every option out there, it requires input to be able to produce output.  
At a time where getting the data into the system is the main cause of friction, and an entirely home-made implementation is both difficult and prone to security vulnerabilities, it is a lot more efficient to rely on existing and proven solutions.

I simply picked Google Forms as a reference implementation because it is a well known and broadly adopted option, that also happens to offer a reasonably accessible and powerful scripting capability that will allow us to forward the results.

Unfortunately, the scripting backend does not easily allow us to keep a stateful REST client around, so we are introducing an extra abstraction layer using GCP Cloud Function to bridge all the incoming submissions from many people, and funnel them through a limited number of REST clients communicating with your Cloud Orchestrator instance.  
The alternative would have been to have an Orchestrator client and credentials in the form script, which is arguably less secure, and definitely not recommended as the full authentication mechanism would have to kick in for each and every submission.

## Security mechanisms

The Function standing in between Form submissions and Orchestrator ensures that only the exact functionality of creating queue items in the configured queue is publicly exposed.  
Moreover, the function will accept incoming data only at the condition of it being signed with the configured signature secret, so that only the form you created is able to successfully push data to your Function endpoint.

The reasons for us to use a custom payload-based signature implementation are:
* reduce dependencies on GCP-specific features to avoid vendor lock-in
* avoid the [complex authentication mechanisms](https://cloud.google.com/functions/docs/securing/authenticating) offered by GCP Functions

In essence, authentication implementations typically sits somewhere in a triangle where the extremities are:
* Genericity
* Security
* Simplicity

GCP authentication mechanisms are famous for being generic and extremely secure.

## What if I have a self-hosted Orchestrator

You will need to change the code included in the Function to use the credential format used in on-prem Orchestrator, namely:
* Tenant name
* User name (or email)
* Password

You may find more details about this in the repository of the [Node.JS module for Orchestrator](https://github.com/UiPath/orchestrator-nodejs).