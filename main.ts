import { Construct } from "constructs";
import { App, TerraformStack, TerraformVariable } from "cdktf";
import * as google from "./.gen/providers/googleworkspace";
import * as onepassword from "./.gen/providers/onepassword";
import * as gh from "@cdktf/provider-github";
import * as pd from "@cdktf/provider-pagerduty";
import * as dd from "@cdktf/provider-datadog";
import * as slack from "./.gen/providers/slack";

import teams from "./data/teams.json";
import users from "./data/users.json";
import projects from "./data/projects.json";

const domain = "mycorp.com";
const githubOrg = "mycorp";

class OrgMember extends Construct {
  constructor(scope: Construct, private org: OrgStructure, private user: User) {
    super(scope, `orgmember-${org.id}-${user.email}`);

    new google.groupMember.GroupMember(this, "member", {
      groupId: org.group.id,
      email: user.email,
    });
  }

  public makeDev() {
    if (!this.org.team) {
      return;
    }
    const ghUser = new gh.dataGithubUser.DataGithubUser(this, "github-user", {
      username: this.user.githubUser,
    });

    new gh.teamMembership.TeamMembership(this, "team-membership", {
      teamId: this.org.team.id,
      username: ghUser.name,
    });
  }
}

export class OrgStructure extends Construct {
  public group: google.group.Group;
  public id: string;
  public team?: gh.team.Team;

  constructor(scope: Construct, name: string, private isDev: boolean) {
    super(scope, `orgstructure-${name}`);
    this.id = name.replace(" ", "_").replace(":", "_");
    this.group = new google.group.Group(this, "group", {
      email: `${this.id}@${domain}`,
      name: name,
    });

    if (this.isDev) {
      this.team = new gh.team.Team(this, "team", {
        name,
      });
    }
  }

  public addUser(user: User) {
    const orgMember = new OrgMember(this, this, user);

    if (this.isDev && this.team) {
      orgMember.makeDev();
    }

    return orgMember;
  }

  public giveRepoPermission(
    repo: gh.repository.Repository,
    permission?: gh.teamRepository.TeamRepositoryConfig["permission"]
  ) {
    if (!this.team) {
      return;
    }
    new gh.teamRepository.TeamRepository(this, "team-repo", {
      teamId: this.team.id,
      repository: repo.id,
      permission,
    });
  }

  protected createSlackChannel(
    name: string,
    topic: string,
    isPrivate: boolean
  ) {
    new slack.conversation.Conversation(this, "slack-channel", {
      name,
      topic,
      isPrivate,
    });
  }
}

export class Team extends OrgStructure {
  constructor(
    scope: Construct,
    props: {
      name: string;
      onepassword_vault: string;
      dev?: boolean;
      projects: Project[]; // ids of the projects
    }
  ) {
    super(scope, `team-${props.name}`, props.dev || false);

    this.createSlackChannel(
      `team-${this.id}`,
      `Team channel for ${props.name}
The place for team related stuff.`,
      true
    );
  }
}

export class Project extends OrgStructure {
  private pdTeam: pd.team.Team;

  constructor(
    scope: Construct,
    props: {
      name: string;
      onepassword_vault: string;
      github_repo: string;
    }
  ) {
    super(scope, `project-${props.name}`, true);

    const repo = new gh.repository.Repository(this, "repo", {
      name: `${githubOrg}/${props.github_repo}`,
      visibility: "internal",
    });

    this.giveRepoPermission(repo);

    this.pdTeam = new pd.team.Team(this, "pagerduty-team", {
      name: props.name,
    });

    this.createSlackChannel(
      `proj-${this.id}`,
      `Project channel for ${props.name}
Please be aware that clients are in this channel.`,
      false
    );
  }

  public addUser(user: User) {
    const orgMember = super.addUser(user);

    const pdUser = new pd.user.User(orgMember, "pagerduty-user", {
      email: user.email,
      name: user.name,
    });

    new pd.teamMembership.TeamMembership(orgMember, "pagerduty-team", {
      userId: pdUser.id,
      teamId: this.pdTeam.id,
    });

    return orgMember;
  }
}

export class User extends Construct {
  public email: string;
  public githubUser: string;
  public user: google.user.User;
  public name: string;

  constructor(
    scope: Construct,
    props: {
      name: string;
      teams: Team[]; // ids of the team
      projects: Project[]; // ids of the projects outside of the teams projects
      onepassword_vault: string;
      github_user: string;
    }
  ) {
    const email = `${props.name.toLowerCase().replace(" ", ".")}@${domain}`;
    super(scope, email);
    this.email = email;
    this.githubUser = props.github_user;
    this.name = props.name;

    const gmailPassword = new onepassword.item.Item(this, "gmail-password", {
      vault: props.onepassword_vault,
      category: "login",
      passwordRecipe: {
        digits: true,
        letters: true,
        symbols: true,
        length: 64,
      },
    }).password;

    this.user = new google.user.User(this, "user", {
      primaryEmail: email,
      password: gmailPassword,
      // Note for future self: handle names with more than one space
      name: {
        givenName: props.name.split(" ")[0],
        familyName: props.name.split(" ")[1],
      },
    });

    new dd.user.User(this, "datadog-user", {
      email,
    });

    props.teams.forEach((team) => team.addUser(this));
    props.projects.forEach((project) => project.addUser(this));
  }
}
class ITStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new google.provider.GoogleworkspaceProvider(this, "googleworkspace");
    new onepassword.provider.OnepasswordProvider(this, "onepassword", {
      token: new TerraformVariable(this, "onepassword_token", {
        type: "string",
        sensitive: true,
      }).stringValue,
      url: new TerraformVariable(this, "onepassword_connect_url", {})
        .stringValue,
    });
    new gh.provider.GithubProvider(this, "github");
    new pd.provider.PagerdutyProvider(this, "pagerduty", {
      token: new TerraformVariable(this, "pagerduty_token", {
        type: "string",
        sensitive: true,
      }).stringValue,
    });
    new dd.provider.DatadogProvider(this, "datadog");
    new slack.provider.SlackProvider(this, "slack", {
      token: new TerraformVariable(this, "slack_token", {
        type: "string",
        sensitive: true,
      }).stringValue,
    });

    const projectMap = Object.entries(projects).reduce(
      (acc, [name, project]) => ({
        ...acc,
        [name]: new Project(this, project),
      }),
      {} as { [name: string]: Project }
    );

    const teamMap = Object.entries(teams).reduce(
      (acc, [name, team]) => ({
        ...acc,
        [name]: new Team(this, {
          ...team,
          projects: team.projects.map((p) => projectMap[p]),
        }),
      }),
      {} as { [name: string]: Team }
    );

    users.forEach((user) => {
      new User(this, {
        ...user,
        teams: user.teams.map((t) => teamMap[t]),
        projects: (user.projects || []).map((p) => projectMap[p]),
      });
    });
  }
}

const app = new App();
new ITStack(app, "it-stack");
app.synth();
