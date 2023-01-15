The following is a set of guidelines for contributing to Diginext. Please spend several minutes reading these guidelines before you create an issue or pull request.

## Code of Conduct

We have adopted a [Code of Conduct](CODE_OF_CONDUCT.md) that we expect project participants to adhere to. Please read the full text so that you can understand what actions will and will not be tolerated.

## Open Development

All work on Diginext happens directly on [GitHub](https://github.com/digitopvn/diginext). Both core team members and external contributors send pull requests which go through the same review process.

## Branch Organization

According to our [release schedule](changelog#release-schedule), we maintain two branches, `main` and `feature`. If you send a bugfix pull request, please do it against the `main` branch, if it's a feature pull request, please do it against the `feature` branch.

## Bugs

We are using [GitHub Issues](https://github.com/digitopvn/diginext/issues) for bug tracking. The best way to get your bug fixed is by using our [issue helper](http://new-issue.ant.design) and provide reproduction steps with this [template](https://u.ant.design/codesandbox-repro).

Before you report a bug, please make sure you've searched existing issues, and read our [FAQ](FAQ.md).

## Proposing a Change

If you intend to change the public API or introduce new feature, we also recommend you use our [issue helper](http://new-issue.ant.design) to create a feature request issue.

If you want to help on new API, please reference [API Naming Rules](https://github.com/digitopvn/diginext/wiki/API-Naming-rules) to name it.

## Your First Pull Request

Working on your first Pull Request? You can learn how from this free video series:

[How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

To help you get your feet wet and get you familiar with our contribution process, we have a list of [good first issues](https://github.com/digitopvn/diginext/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) that contain bugs or small features that have a relatively limited scope. This is a great place to get started.

If you decide to fix an issue, please be sure to check the comment thread in case somebody is already working on a fix. If nobody is working on it at the moment, please leave a comment stating that you intend to work on it so other people don't accidentally duplicate your effort.

If somebody claims an issue but doesn't follow up for more than two weeks, it's fine to take over it but you should still leave a comment.

## Sending a Pull Request

The core team is monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation.

**Before submitting a pull request**, please make sure the following is done:

1. Fork the repository and create your branch from the [correct branch](#branch-organization).
1. Run `npm install` in the repository root.
   > For Windows 10 development environment, if you run into error `gyp err! find vs msvs_version not set from command line or npm config`, please install [the latest Python v3](https://www.python.org/downloads/) and **Desktop development with C++** through [Visual Studio Installer](https://docs.microsoft.com/en-us/visualstudio/install/install-visual-studio?view=vs-2019#step-3---install-the-visual-studio-installer) before running `npm install`
1. If you've fixed a bug or added code that should be tested, add tests!
1. Ensure the test suite passes (npm run test). Tip: `npm test -- --watch TestName` is helpful in development.
1. Run `npm test -- -u` to update the [jest snapshots](http://facebook.github.io/jest/docs/en/snapshot-testing.html#snapshot-testing-with-jest) and commit these changes as well (if there are any updates).
1. Ensure the UI change passes `npm run test-image`，Run `npm run test-image -- -u` to update UI snapshots and commit these changes as well (if there are any updates), **UI test base on [Docker](https://docs.docker.com/get-docker/), need download the corresponding installation according to the platform**
1. Make sure your code lints (npm run lint). Tip: Lint runs automatically when you `git commit` (Use [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)).

Sending a Pull Request to [react-component](https://github.com/react-component/):

If it's a bugfix pull request, after it's merged, the core team will release a patch release for that component as soon as possible, then you only need to reinstall antd in your project to get the latest patch release. If it's a feature pull request, after it's merged, the core team will release a minor release, then you need raise another pull request to [Diginext](https://github.com/digitopvn/diginext/) to update dependencies, document and TypeScript interfaces (if needed).

## Development Workflow

After cloning `dx`, run `npm install` to fetch its dependencies. Then, you can run several commands:

1. `npm start` runs Diginext website locally.
1. `npm run lint` checks the code style.
2. `npm test` runs the complete test suite.

## Development Tools

- Docker: https://www.docker.com/

## Being a collaborator

If you are an active contributor and are willing to work with Diginext Team in our opensource workflow, you can [apply to be a outside collaborator](https://github.com/digitopvn/diginext/wiki/Collaborators#how-to-apply-for-being-a-collaborator).

---

**Working on your first Pull Request?** You can learn how from this *free* series [How to Contribute to an Open Source Project on GitHub](https://kcd.im/pull-request)