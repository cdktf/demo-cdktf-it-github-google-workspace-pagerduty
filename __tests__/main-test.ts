import "cdktf/lib/testing/adapters/jest"; // Load types for expect matchers
import { Testing } from "cdktf";
import { Project, Team, User } from "../main";
import { item } from "../.gen/providers/onepassword";
import {
  group,
  groupMember,
  user as googleUser,
} from "../.gen/providers/googleworkspace";
import {
  teamMembership,
  team as ghTeam,
  repository,
  teamRepository,
} from "@cdktf/provider-github";

import {
  teamMembership as pagerDutyTeamMembership,
  team as pagerDutyTeam,
} from "@cdktf/provider-pagerduty";
import { user as datadogUser } from "@cdktf/provider-datadog";

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
      expect(synth).toHaveResource(item.Item);
      expect(synth).toHaveResourceWithProperties(googleUser.User, {
        primary_email: "john.doe@mycorp.com",
      });
    });

    it("should create a data dog user", () => {
      expect(
        Testing.synthScope((scope) => {
          new User(scope, userProps);
        })
      ).toHaveResource(datadogUser.User);
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
      ).toHaveResource(group.Group);
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
      ).toHaveResource(groupMember.GroupMember);
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

        expect(synth).toHaveResource(teamMembership.TeamMembership);
        expect(synth).toHaveResource(ghTeam.Team);
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
              new repository.Repository(scope, "myRepo", {
                name: "myRepo",
              }),
              "ADMIN"
            );
          })
        ).toHaveResource(teamRepository.TeamRepository);
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
      ).toHaveResourceWithProperties(repository.Repository, {
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

      expect(synth).toHaveResourceWithProperties(pagerDutyTeam.Team, {
        name: "My Project",
      });
      expect(synth).toHaveResource(pagerDutyTeamMembership.TeamMembership);
    });
  });
});
