# Demo: CDKTF as IT automation tool

_This repository was created for demo purposes and will not be kept up-to-date with future releases of CDK for Terraform (CDKTF); as such, it has been archived and is no longer supported in any way by HashiCorp. You are welcome to try out the archived version of the code in this example project, but there are no guarantees that it will continue to work with newer versions of CDKTF. We do not recommend directly using this sample code in production projects without extensive testing, and HashiCorp disclaims any and all liability resulting from use of this code._

-----

## Problem Statement

### Setup

When running an engineering org there is a challenge of keeping all permissions / access managed across all tools. This can be a point of friction that is easily automated away using Terraform and CDKTF can make this even nicer.

The scenario we are simulating here is an organization at a size where SSO solutions are not yet in place, but access needs to be managed nevertheless. The company uses the Google suite, GitHub, PagerDuty, DataDog, Slack and 1Password.

### Usecase

We will use CDKTF to create accounts in all these platforms with the needed permissions. We will use a JSON file as the single source of truth for simplicity.
The CDKTF can declaratively create accounts and roles, and we can even keep the secrets in Terraform Cloud if we want to.
