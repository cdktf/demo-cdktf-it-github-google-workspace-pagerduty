# Demo: CDKTF as IT automation tool

## Problem Statement

### Setup

When running an engineering org there is a challenge of keeping all permissions / access managed across all tools. This can be a point of friction that is easily automated away using Terraform and CDKTF can make this even nicer.

The scenario we are simulating here is an organization at a size where SSO solutions are not yet in place, but access needs to be managed nevertheless. The company uses the Google suite, GitHub, PagerDuty, DataDog, Slack and 1Password.

### Usecase

We will use CDKTF to create accounts in all these platforms with the needed permissions. We will use a JSON file as the single source of truth for simplicity.
The CDKTF can declaratively create accounts and roles, and we can even keep the secrets in Terraform Cloud if we want to.
