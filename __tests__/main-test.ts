import "cdktf/lib/testing/adapters/jest"; // Load types for expect matchers
import { Testing } from "cdktf";
import { Project, Team, User } from "../main";
import { Item } from "../.gen/providers/onepassword";
import {
  Group,
  GroupMember,
  User as GoogleUser,
} from "../.gen/providers/googleworkspace";
import {
  TeamMembership,
  Team as GhTeam,
  Repository,
  TeamRepository,
} from "@cdktf/provider-github";

import {
  TeamMembership as PagerDutyTeamMembership,
  Team as PagerDutyTeam,
} from "@cdktf/provider-pagerduty";
import { User as DatadogUser } from "@cdktf/provider-datadog";

const userProps = {
  name: "John Doe",
  teams: [],
  projects: [],
  onepassword_vault: "1password",
  github_user: "johndoe",
};

describe("My Companies IT setup", () => {
  describe("User", () => {
    it("should create a google account for everyone with a password in 1password", () => {
      const synth = Testing.synthScope((scope) => {
        new User(scope, userProps);
      });
      expect(synth).toHaveResource(Item);
      expect(synth).toHaveResourceWithProperties(GoogleUser, {
        primary_email: "john.doe@mycorp.com",
      });
    });

    it("should create a data dog user", () => {
      expect(
        Testing.synthScope((scope) => {
          new User(scope, userProps);
        })
      ).toHaveResource(DatadogUser);
    });
  });

  describe("Team", () => {
    it("should create a group email", () => {
      expect(
        Testing.synthScope((scope) => {
          new Team(scope, {
            name: "My Team",
            onepassword_vault: "1password",
            projects: [],
          });
        })
      ).toHaveResource(Group);
    });

    it("should add users to the group", () => {
      expect(
        Testing.synthScope((scope) => {
          const t = new Team(scope, {
            name: "My Team",
            onepassword_vault: "1password",
            projects: [],
          });
          t.addUser(new User(scope, userProps));
        })
      ).toHaveResource(GroupMember);
    });

    describe("Dev Teams", () => {
      it("should create a github team and add users", () => {
        const synth = Testing.synthScope((scope) => {
          const t = new Team(scope, {
            name: "My Team",
            onepassword_vault: "1password",
            projects: [],
            dev: true,
          });
          t.addUser(new User(scope, userProps));
        });

        expect(synth).toHaveResource(TeamMembership);
        expect(synth).toHaveResource(GhTeam);
      });

      it("should create a github repo permissions to a user", () => {
        expect(
          Testing.synthScope((scope) => {
            const t = new Team(scope, {
              name: "My Team",
              onepassword_vault: "1password",
              projects: [],
              dev: true,
            });
            t.giveRepoPermission(
              new Repository(scope, "myRepo", {
                name: "myRepo",
              }),
              "ADMIN"
            );
          })
        ).toHaveResource(TeamRepository);
      });
    });
  });

  describe("Project", () => {
    it("should create a repo", () => {
      expect(
        Testing.synthScope((scope) => {
          new Project(scope, {
            name: "My Project",
            onepassword_vault: "1password",
            github_repo: "myRepo",
          });
        })
      ).toHaveResourceWithProperties(Repository, {
        name: "mycorp/myRepo",
        visibility: "internal",
      });
    });

    it("should create a pager duty team and add the user", () => {
      const synth = Testing.synthScope((scope) => {
        const t = new Project(scope, {
          name: "My Project",
          onepassword_vault: "1password",
          github_repo: "myRepo",
        });
        t.addUser(new User(scope, userProps));
      });

      expect(synth).toHaveResourceWithProperties(PagerDutyTeam, {
        name: "My Project",
      });
      expect(synth).toHaveResource(PagerDutyTeamMembership);
    });
  });
});
