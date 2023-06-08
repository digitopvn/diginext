## [3.7.3](https://github.com/digitopvn/diginext/compare/v3.7.2...v3.7.3) (2023-06-08)


### Bug Fixes

* **server:** issue of roll out still remain prerelease env vars ([926cfee](https://github.com/digitopvn/diginext/commit/926cfeef532f34e94b0b6e1a7b05c8ec971bc362))
* **server:** issue of roll out still remain prerelease env vars ([#193](https://github.com/digitopvn/diginext/issues/193)) ([223b408](https://github.com/digitopvn/diginext/commit/223b4087d241bf73621e7c2c8e1c9f880edaaf29))

## [3.7.2](https://github.com/digitopvn/diginext/compare/v3.7.1...v3.7.2) (2023-06-08)


### Bug Fixes

* **cli:** improve kubectl command set image, port, secret ([bcc14c5](https://github.com/digitopvn/diginext/commit/bcc14c50e20c196d6066a3bb660a5b8abdff2675))
* **cli:** improve kubectl command set image, port, secret ([#192](https://github.com/digitopvn/diginext/issues/192)) ([e82b8ee](https://github.com/digitopvn/diginext/commit/e82b8ee0184fecf899e47026a677436d5adbbc31))
* **cli:** kb set deploy - cannot access image url before init ([3323f20](https://github.com/digitopvn/diginext/commit/3323f205a05128af2dc0a1b555a6aa981d135994))

## [3.7.1](https://github.com/digitopvn/diginext/compare/v3.7.0...v3.7.1) (2023-06-08)


### Bug Fixes

* **cli,server:** issue of resolving dockerfile ([a5f8efa](https://github.com/digitopvn/diginext/commit/a5f8efaf718aae874144471502ebc4d1481e54e2))
* **cli,server:** issue of resolving dockerfile ([#191](https://github.com/digitopvn/diginext/issues/191)) ([66e68b8](https://github.com/digitopvn/diginext/commit/66e68b8efc76bc35bf829862798849d33694f8da))

# [3.7.0](https://github.com/digitopvn/diginext/compare/v3.6.4...v3.7.0) (2023-06-08)


### Bug Fixes

* **cli:** refactor build command to request server to build image ([12b1ac2](https://github.com/digitopvn/diginext/commit/12b1ac291f5014d85bf1fbb59928ef13585e5bc2))


### Features

* **cli:** request server to build image ([#190](https://github.com/digitopvn/diginext/issues/190)) ([7aceaff](https://github.com/digitopvn/diginext/commit/7aceaff483d6f58e021b4a224a5d12bbec6b5397))

## [3.6.4](https://github.com/digitopvn/diginext/compare/v3.6.3...v3.6.4) (2023-06-08)


### Bug Fixes

* **server,api:** skip checking namespace when create deploy environment ([91aa0dc](https://github.com/digitopvn/diginext/commit/91aa0dc7f8b1f8d2dd878d2670a3ae7910ef5280))
* **server,api:** skip checking namespace when create deploy environment ([#189](https://github.com/digitopvn/diginext/issues/189)) ([68ae632](https://github.com/digitopvn/diginext/commit/68ae6323fda4ce828f28c6a0dc1c632ee78bca49))

## [3.6.3](https://github.com/digitopvn/diginext/compare/v3.6.2...v3.6.3) (2023-06-07)


### Bug Fixes

* **server,api:** correct build base on number,app,project when releasing ([cb23f74](https://github.com/digitopvn/diginext/commit/cb23f74241a54a0939458ea3a67d00a509979edd))
* **server:** unable to read build number to generate deploy yaml ([20c0f94](https://github.com/digitopvn/diginext/commit/20c0f943c7a19dda67447137de1adea44e7b6fd6))

## [3.6.2](https://github.com/digitopvn/diginext/compare/v3.6.1...v3.6.2) (2023-06-07)


### Bug Fixes

* **server,api:** add build number to create,update deploy environment api ([ceeb968](https://github.com/digitopvn/diginext/commit/ceeb968fc009eb591def542e49547d6a111b0205))

## [3.6.1](https://github.com/digitopvn/diginext/compare/v3.6.0...v3.6.1) (2023-06-07)


### Bug Fixes

* **admin:** correct url to diginext official website ([#180](https://github.com/digitopvn/diginext/issues/180)) ([eef882e](https://github.com/digitopvn/diginext/commit/eef882e713e5e73a215aef47f703d67fcbe19206))
* **cli:** show update warning only when there are breaking changes ([171dcd5](https://github.com/digitopvn/diginext/commit/171dcd57455e9fb37cad97c349bba64842b19267))
* **server:** disable body in activity logs to save disk usage ([7d84a71](https://github.com/digitopvn/diginext/commit/7d84a710aab252429d02ee2cd58c257179d07f37))
* **server:** disable body in activity logs to save disk usage ([#183](https://github.com/digitopvn/diginext/issues/183)) ([7043b4a](https://github.com/digitopvn/diginext/commit/7043b4a46b77f35fb894ae586c7337e78b29b5aa))

## [3.6.1-prerelease.1](https://github.com/digitopvn/diginext/compare/v3.6.0...v3.6.1-prerelease.1) (2023-06-06)


### Bug Fixes

* **admin:** correct url to diginext official website ([#180](https://github.com/digitopvn/diginext/issues/180)) ([eef882e](https://github.com/digitopvn/diginext/commit/eef882e713e5e73a215aef47f703d67fcbe19206))
* **server:** disable body in activity logs to save disk usage ([7d84a71](https://github.com/digitopvn/diginext/commit/7d84a710aab252429d02ee2cd58c257179d07f37))
* **server:** disable body in activity logs to save disk usage ([#183](https://github.com/digitopvn/diginext/issues/183)) ([7043b4a](https://github.com/digitopvn/diginext/commit/7043b4a46b77f35fb894ae586c7337e78b29b5aa))

# [3.6.0](https://github.com/digitopvn/diginext/compare/v3.5.2...v3.6.0) (2023-06-01)


### Bug Fixes

* **admin:** correct url to diginext official website ([88fe210](https://github.com/digitopvn/diginext/commit/88fe210fdd51e940599aefd2456b1c6155d68077))
* **admin:** more responsive support for mobile screen ([940a5bf](https://github.com/digitopvn/diginext/commit/940a5bfe48922e91781a3f018a9a538dae19a9cf))
* **admin:** more responsive support for mobile screen ([#177](https://github.com/digitopvn/diginext/issues/177)) ([5610304](https://github.com/digitopvn/diginext/commit/56103048f8496289ad34840a983bb661cddf54c9))
* **bitbucket repo:** issue of creating new bitbucket repo ([#123](https://github.com/digitopvn/diginext/issues/123)) ([c4a6919](https://github.com/digitopvn/diginext/commit/c4a6919f919f8aa8a1279864b36ccc445f1789a0))
* **clean up:** build docker base and deploy prerelease ([08e908f](https://github.com/digitopvn/diginext/commit/08e908f783d98bc6e1f14799f921ae42b6ffd178))
* **clean up:** build docker base and deploy prerelease ([#178](https://github.com/digitopvn/diginext/issues/178)) ([5054cd9](https://github.com/digitopvn/diginext/commit/5054cd98725b2d3ec914024695bfeb51fab2f0e1))
* **ga:** deploy condition fix ([17818f2](https://github.com/digitopvn/diginext/commit/17818f2607f2a53b74cd206f9933297586681663))
* **ga:** deploy condition fix ([#165](https://github.com/digitopvn/diginext/issues/165)) ([982aae5](https://github.com/digitopvn/diginext/commit/982aae54cdd652509cd25be53cd25fab14701d57))
* **github actions:** combine docker release with main release flow ([ac13dc2](https://github.com/digitopvn/diginext/commit/ac13dc2f1d8009f5d4407fb4bf191f38823f052b))
* **github actions:** combine docker release with main release flow ([#145](https://github.com/digitopvn/diginext/issues/145)) ([6c9bd5e](https://github.com/digitopvn/diginext/commit/6c9bd5ee2a5adf832a0d94ea018f578b846d01d8))
* **github actions:** deploy topgroup-v2 ([f57ce8d](https://github.com/digitopvn/diginext/commit/f57ce8d8a17b28bebedf79622f3571fbcc6ad313))
* **github actions:** run next job on succesful jobs ([236bb91](https://github.com/digitopvn/diginext/commit/236bb9181c9f1a9c4a789f7e01aac72b9d740aeb))
* **github actions:** run next job on succesful jobs ([#146](https://github.com/digitopvn/diginext/issues/146)) ([ba99e16](https://github.com/digitopvn/diginext/commit/ba99e1616a78655d0fe219f9e07869dfed7b33f1))
* **server:** delete project issue ([8798ba0](https://github.com/digitopvn/diginext/commit/8798ba03c510c563e695b53321630a53275ec9c7))
* **server:** generate yaml not redirect when ssl issuer is none ([7d58ae3](https://github.com/digitopvn/diginext/commit/7d58ae314438d741da55a346d01bf52bbb3a835b))
* **server:** select correct ingress class when generate yaml ([35ba370](https://github.com/digitopvn/diginext/commit/35ba3702658c64f171cd3751846b520ac5ac3448))
* **server:** select correct ingress class when generate yaml ([#163](https://github.com/digitopvn/diginext/issues/163)) ([7364300](https://github.com/digitopvn/diginext/commit/7364300c7201e81f729fc4dbe1dfc39a62cbdd0f))
* **server:** update resource quota scale matrix ([1d859b7](https://github.com/digitopvn/diginext/commit/1d859b728b1837295e8af867477aef6cb809882f))
* **startup script:** build docker base, catch error of startup scripts ([ff5f0ac](https://github.com/digitopvn/diginext/commit/ff5f0ac9ae274262b4d8e2703e9db20efd09e7cb))
* **startup script:** build docker base, catch error of startup scripts ([#179](https://github.com/digitopvn/diginext/issues/179)) ([d071b94](https://github.com/digitopvn/diginext/commit/d071b9472f84188513f4cb939706ac15e4c112d1))


### Features

* **server,admin:** partial support mobile screen ([aee3593](https://github.com/digitopvn/diginext/commit/aee3593820dde4ae73945a2538b0b928fce02c25))
* **server,admin:** partial support mobile screen ([#175](https://github.com/digitopvn/diginext/issues/175)) ([6d515fe](https://github.com/digitopvn/diginext/commit/6d515fe04f780366ec84e4c191b395d5d04a59d1))
* **server,cli:** add microk8s installation script ([99c7b7b](https://github.com/digitopvn/diginext/commit/99c7b7b5455e963001a98cce9aaa6b418aa2f578))
* **server,cli:** add microk8s installation script ([#167](https://github.com/digitopvn/diginext/issues/167)) ([674b057](https://github.com/digitopvn/diginext/commit/674b0571b64811802eeac93d09f4e0e22721b1b7))


### Performance Improvements

* **server:** delete project faster ([a06798a](https://github.com/digitopvn/diginext/commit/a06798a2f5994d8e86db60c5e73ade3b47e5771c))

# [3.6.0-prerelease.6](https://github.com/digitopvn/diginext/compare/v3.6.0-prerelease.5...v3.6.0-prerelease.6) (2023-06-01)


### Bug Fixes

* **startup script:** build docker base, catch error of startup scripts ([ff5f0ac](https://github.com/digitopvn/diginext/commit/ff5f0ac9ae274262b4d8e2703e9db20efd09e7cb))
* **startup script:** build docker base, catch error of startup scripts ([#179](https://github.com/digitopvn/diginext/issues/179)) ([d071b94](https://github.com/digitopvn/diginext/commit/d071b9472f84188513f4cb939706ac15e4c112d1))

# [3.6.0-prerelease.5](https://github.com/digitopvn/diginext/compare/v3.6.0-prerelease.4...v3.6.0-prerelease.5) (2023-06-01)


### Bug Fixes

* **clean up:** build docker base and deploy prerelease ([08e908f](https://github.com/digitopvn/diginext/commit/08e908f783d98bc6e1f14799f921ae42b6ffd178))
* **clean up:** build docker base and deploy prerelease ([#178](https://github.com/digitopvn/diginext/issues/178)) ([5054cd9](https://github.com/digitopvn/diginext/commit/5054cd98725b2d3ec914024695bfeb51fab2f0e1))
* **server:** update resource quota scale matrix ([1d859b7](https://github.com/digitopvn/diginext/commit/1d859b728b1837295e8af867477aef6cb809882f))

# [3.6.0-prerelease.4](https://github.com/digitopvn/diginext/compare/v3.6.0-prerelease.3...v3.6.0-prerelease.4) (2023-06-01)


### Bug Fixes

* **admin:** more responsive support for mobile screen ([940a5bf](https://github.com/digitopvn/diginext/commit/940a5bfe48922e91781a3f018a9a538dae19a9cf))
* **admin:** more responsive support for mobile screen ([#177](https://github.com/digitopvn/diginext/issues/177)) ([5610304](https://github.com/digitopvn/diginext/commit/56103048f8496289ad34840a983bb661cddf54c9))

# [3.6.0-prerelease.3](https://github.com/digitopvn/diginext/compare/v3.6.0-prerelease.2...v3.6.0-prerelease.3) (2023-05-31)


### Bug Fixes

* **server:** delete project issue ([8798ba0](https://github.com/digitopvn/diginext/commit/8798ba03c510c563e695b53321630a53275ec9c7))


### Features

* **server,admin:** partial support mobile screen ([aee3593](https://github.com/digitopvn/diginext/commit/aee3593820dde4ae73945a2538b0b928fce02c25))
* **server,admin:** partial support mobile screen ([#175](https://github.com/digitopvn/diginext/issues/175)) ([6d515fe](https://github.com/digitopvn/diginext/commit/6d515fe04f780366ec84e4c191b395d5d04a59d1))


### Performance Improvements

* **server:** delete project faster ([a06798a](https://github.com/digitopvn/diginext/commit/a06798a2f5994d8e86db60c5e73ade3b47e5771c))

# [3.6.0-prerelease.2](https://github.com/digitopvn/diginext/compare/v3.6.0-prerelease.1...v3.6.0-prerelease.2) (2023-05-29)


### Bug Fixes

* **server:** generate yaml not redirect when ssl issuer is none ([7d58ae3](https://github.com/digitopvn/diginext/commit/7d58ae314438d741da55a346d01bf52bbb3a835b))

# [3.6.0-prerelease.1](https://github.com/digitopvn/diginext/compare/v3.5.3-prerelease.6...v3.6.0-prerelease.1) (2023-05-29)


### Features

* **server,cli:** add microk8s installation script ([99c7b7b](https://github.com/digitopvn/diginext/commit/99c7b7b5455e963001a98cce9aaa6b418aa2f578))
* **server,cli:** add microk8s installation script ([#167](https://github.com/digitopvn/diginext/issues/167)) ([674b057](https://github.com/digitopvn/diginext/commit/674b0571b64811802eeac93d09f4e0e22721b1b7))

## [3.5.3-prerelease.6](https://github.com/digitopvn/diginext/compare/v3.5.3-prerelease.5...v3.5.3-prerelease.6) (2023-05-29)


### Bug Fixes

* **ga:** deploy condition fix ([17818f2](https://github.com/digitopvn/diginext/commit/17818f2607f2a53b74cd206f9933297586681663))
* **ga:** deploy condition fix ([#165](https://github.com/digitopvn/diginext/issues/165)) ([982aae5](https://github.com/digitopvn/diginext/commit/982aae54cdd652509cd25be53cd25fab14701d57))

## [3.5.3-prerelease.5](https://github.com/digitopvn/diginext/compare/v3.5.3-prerelease.4...v3.5.3-prerelease.5) (2023-05-29)


### Bug Fixes

* **server:** select correct ingress class when generate yaml ([35ba370](https://github.com/digitopvn/diginext/commit/35ba3702658c64f171cd3751846b520ac5ac3448))
* **server:** select correct ingress class when generate yaml ([#163](https://github.com/digitopvn/diginext/issues/163)) ([7364300](https://github.com/digitopvn/diginext/commit/7364300c7201e81f729fc4dbe1dfc39a62cbdd0f))

## [3.5.3-prerelease.4](https://github.com/digitopvn/diginext/compare/v3.5.3-prerelease.3...v3.5.3-prerelease.4) (2023-05-29)


### Bug Fixes

* **github actions:** deploy topgroup-v2 ([f57ce8d](https://github.com/digitopvn/diginext/commit/f57ce8d8a17b28bebedf79622f3571fbcc6ad313))

## [3.5.3-prerelease.3](https://github.com/digitopvn/diginext/compare/v3.5.3-prerelease.2...v3.5.3-prerelease.3) (2023-05-27)


### Bug Fixes

* **github actions:** run next job on succesful jobs ([236bb91](https://github.com/digitopvn/diginext/commit/236bb9181c9f1a9c4a789f7e01aac72b9d740aeb))
* **github actions:** run next job on succesful jobs ([#146](https://github.com/digitopvn/diginext/issues/146)) ([ba99e16](https://github.com/digitopvn/diginext/commit/ba99e1616a78655d0fe219f9e07869dfed7b33f1))

## [3.5.3-prerelease.2](https://github.com/digitopvn/diginext/compare/v3.5.3-prerelease.1...v3.5.3-prerelease.2) (2023-05-27)


### Bug Fixes

* **github actions:** combine docker release with main release flow ([ac13dc2](https://github.com/digitopvn/diginext/commit/ac13dc2f1d8009f5d4407fb4bf191f38823f052b))
* **github actions:** combine docker release with main release flow ([#145](https://github.com/digitopvn/diginext/issues/145)) ([6c9bd5e](https://github.com/digitopvn/diginext/commit/6c9bd5ee2a5adf832a0d94ea018f578b846d01d8))

## [3.5.3-prerelease.1](https://github.com/digitopvn/diginext/compare/v3.5.2...v3.5.3-prerelease.1) (2023-05-26)


### Bug Fixes

* **bitbucket repo:** issue of creating new bitbucket repo ([#123](https://github.com/digitopvn/diginext/issues/123)) ([c4a6919](https://github.com/digitopvn/diginext/commit/c4a6919f919f8aa8a1279864b36ccc445f1789a0))

## [3.5.2](https://github.com/digitopvn/diginext/compare/v3.5.1...v3.5.2) (2023-05-26)


### Bug Fixes

* **server,env vars:** fix env var can be empty ([14b3e79](https://github.com/digitopvn/diginext/commit/14b3e79b247e6e67a3a0f61251aeebc17eb292bc))
* **server,env vars:** fix env var can be empty ([#141](https://github.com/digitopvn/diginext/issues/141)) ([e67e01c](https://github.com/digitopvn/diginext/commit/e67e01c373da98fc2699d8efcc8e95f0112414ab))
* **server,generate deploy yaml:** env var value can be undefined ([5862cfb](https://github.com/digitopvn/diginext/commit/5862cfbf5b1b7fd6887164d77e8e8f5f5c4bdcd5))

## [3.5.1](https://github.com/digitopvn/diginext/compare/v3.5.0...v3.5.1) (2023-05-26)


### Bug Fixes

* **server,startup script:** add retry method to registry connecting ([dda8c73](https://github.com/digitopvn/diginext/commit/dda8c73dbfdf2619d3d462bc0472181f79bba772))
* **server:** authenticate registry before building & pushing image ([ecb682d](https://github.com/digitopvn/diginext/commit/ecb682db4b0bd6cf16964b7ecfa9bcfb4f3f413e))
* **server:** authenticate registry before building & pushing image ([#140](https://github.com/digitopvn/diginext/issues/140)) ([44ddeaa](https://github.com/digitopvn/diginext/commit/44ddeaa8bab632478e8e96c879486550576a109a))
* **server:** change clean up cronjob to 7 days ([e90eedc](https://github.com/digitopvn/diginext/commit/e90eedcf6c24cff3a979eb8b6646d5c290eefae2))

# [3.5.0](https://github.com/digitopvn/diginext/compare/v3.4.3...v3.5.0) (2023-05-24)


### Features

* **server,admin:** view application deploy environment logs ([e51b6cc](https://github.com/digitopvn/diginext/commit/e51b6cc8cb9ec5ef95dd514d43827e435b3c499f))
* **server:** app, deploy env - add health status and ready count ([950ec4a](https://github.com/digitopvn/diginext/commit/950ec4a7fe6bbbbb0aa2f3b526a80182838dc18e))
* **server:** app, deploy env, healthz, logs ([#139](https://github.com/digitopvn/diginext/issues/139)) ([7e00a1a](https://github.com/digitopvn/diginext/commit/7e00a1a1b4fe7643a62eb49600dbd86a7711f286))

## [3.4.3](https://github.com/digitopvn/diginext/compare/v3.4.2...v3.4.3) (2023-05-23)


### Bug Fixes

* **server,app controller:** re-generate yaml after updating env vars ([796eddd](https://github.com/digitopvn/diginext/commit/796eddd2280ebd15eeb354adb437b87891d664ca))
* **server,app controller:** re-generate yaml after updating env vars ([#138](https://github.com/digitopvn/diginext/issues/138)) ([04bff87](https://github.com/digitopvn/diginext/commit/04bff8750066f3df90888d018cf9ae734d020ef2))
* **server:** add podman to clean up cronjob ([fec4ee3](https://github.com/digitopvn/diginext/commit/fec4ee32cae2fc97ed70d42d6e88587229e139f2))
* **server:** close db connection when app is terminated ([ae63891](https://github.com/digitopvn/diginext/commit/ae63891ae99f112c1005e5c5336ffc70d49fec70))

## [3.4.2](https://github.com/digitopvn/diginext/compare/v3.4.1...v3.4.2) (2023-05-23)


### Bug Fixes

* **server,dockerfile:** define unqualified-search registries for podman ([c9da8b2](https://github.com/digitopvn/diginext/commit/c9da8b2c9cbb94f5e559ec82233b3fb3fc9b5473))
* **server,dockerfile:** define unqualified-search registries for podman ([#137](https://github.com/digitopvn/diginext/issues/137)) ([541aa67](https://github.com/digitopvn/diginext/commit/541aa6748b38172183673f8b364b0df1e7808fe1))

## [3.4.1](https://github.com/digitopvn/diginext/compare/v3.4.0...v3.4.1) (2023-05-23)


### Bug Fixes

* **cli:** correct workspace dx_key when ask for domain ([6cc060d](https://github.com/digitopvn/diginext/commit/6cc060daca1cea5c202c96db896640376c4ebf85))
* **cli:** correct workspace dx_key when ask for domain ([#136](https://github.com/digitopvn/diginext/issues/136)) ([32b89e7](https://github.com/digitopvn/diginext/commit/32b89e7bdf4d431b5e701f29b73abb0b6761942a))
* **server,admin:** add env vars, deployment yaml drawer ([889f24f](https://github.com/digitopvn/diginext/commit/889f24fa44bc66213c808450179a533112b17e73))

# [3.4.0](https://github.com/digitopvn/diginext/compare/v3.3.1...v3.4.0) (2023-05-22)


### Features

* **server,admin:** modify deploy environment of app ([8c411e8](https://github.com/digitopvn/diginext/commit/8c411e84576311737c33e2e8623fcaad46a56a6d))
* **server,admin:** modify deploy environment of app ([#135](https://github.com/digitopvn/diginext/issues/135)) ([13a57d9](https://github.com/digitopvn/diginext/commit/13a57d97bea15ca3e5edd97b14468f9b744d7a0b))

## [3.3.1](https://github.com/digitopvn/diginext/compare/v3.3.0...v3.3.1) (2023-05-22)


### Bug Fixes

* **server,cli:** flag --create when dx new, dx key in workspace setting ([1722a70](https://github.com/digitopvn/diginext/commit/1722a702c8e2fc4c7dde2ce21d7cef5716c28a7a))
* **server,cli:** flag --create when dx new, dx key in workspace setting ([#134](https://github.com/digitopvn/diginext/issues/134)) ([55e8d69](https://github.com/digitopvn/diginext/commit/55e8d69dd15222c2a78d00978c0107367c23fb2e))

# [3.3.0](https://github.com/digitopvn/diginext/compare/v3.2.2...v3.3.0) (2023-05-22)


### Bug Fixes

* **server,api:** provider not found when creating git repo ([375e351](https://github.com/digitopvn/diginext/commit/375e3512f3518e03dcd06f76daeff875c91e1a14))
* **server,cli:** issue of deleting env vars when update app config ([f798f1c](https://github.com/digitopvn/diginext/commit/f798f1ce8892b4c56d3c61c2325bb1ca06078a31))
* **server,workspace:** delete related data when deleting workspace ([8850d36](https://github.com/digitopvn/diginext/commit/8850d36addc1f15ee1efd40e143b64c001ec1bd4))
* **server:** generate incorrect resource quotas by size ([40a7485](https://github.com/digitopvn/diginext/commit/40a7485535cbe47d4663d9b2a42f034054456ad2))


### Features

* **server,api:** check dx key when create workspace,domain ([2cb5f3f](https://github.com/digitopvn/diginext/commit/2cb5f3f83f142ce35ec54ff48cd15312a4b77755))
* **server,api:** check dx key when create workspace,domain ([#132](https://github.com/digitopvn/diginext/issues/132)) ([b422f7e](https://github.com/digitopvn/diginext/commit/b422f7e247b2e81419af29cf6e41b5c89aedf827))
* **server,cli:** issue of checking quota limit of workspace ([3464d54](https://github.com/digitopvn/diginext/commit/3464d54049a906b4dc1199d36ce113a383bd8389))

## [3.2.2](https://github.com/digitopvn/diginext/compare/v3.2.1...v3.2.2) (2023-05-20)


### Bug Fixes

* **new-app:** skip check verbose git | display progress default 0 ([1ce901a](https://github.com/digitopvn/diginext/commit/1ce901aa89b0fac64083b601efb1fa36b58dd5ed))
* restore dev:nodemon ([366fec5](https://github.com/digitopvn/diginext/commit/366fec52a7394be36d442561a309d2383dfba563))

## [3.2.1](https://github.com/digitopvn/diginext/compare/v3.2.0...v3.2.1) (2023-05-16)


### Bug Fixes

* **server,api:** add create release from app api ([dfac727](https://github.com/digitopvn/diginext/commit/dfac7270a5dae5bfcd2fdc7947738c185edbd986))
* **server,api:** add create release from app api ([#129](https://github.com/digitopvn/diginext/issues/129)) ([4417a25](https://github.com/digitopvn/diginext/commit/4417a25089ac544a447ac8944c151b7ebfdcd442))
* **server,api:** add swagger doc comments ([39d486d](https://github.com/digitopvn/diginext/commit/39d486dbcb23c87dd8079a0fe423da2de43f9bb5))

# [3.2.0](https://github.com/digitopvn/diginext/compare/v3.1.1...v3.2.0) (2023-05-15)


### Bug Fixes

* **server,api:** add --build-arg to build process ([d6275f4](https://github.com/digitopvn/diginext/commit/d6275f42fde6a38fc0e8099c68843b938d3784de))
* **server,api:** issue of x-api-key not working ([4e1ca4e](https://github.com/digitopvn/diginext/commit/4e1ca4ee1b898cf1b3ee6329f2da205ca6cd32ce))
* **server:** check existing domain when add new ([2c87d2a](https://github.com/digitopvn/diginext/commit/2c87d2a16bfd6349238d56696ce4a95b5606d668))
* **server:** issue of not update new domains ([6715df1](https://github.com/digitopvn/diginext/commit/6715df1b1aa5ec163988655ae422cca16963dc30))


### Features

* **server:** add domains to production environment ([aa459bf](https://github.com/digitopvn/diginext/commit/aa459bfec2f495be62034632a79ead9e3b937174))
* **server:** add new domain to app deploy environment ([19ff3f6](https://github.com/digitopvn/diginext/commit/19ff3f6f73c3db136b329d1b27539f2115739622))

## [3.1.1](https://github.com/digitopvn/diginext/compare/v3.1.0...v3.1.1) (2023-05-11)


### Bug Fixes

* **cli,server:** update git provider name for apps if it's not existed ([a19e593](https://github.com/digitopvn/diginext/commit/a19e593d161fc1deb002973d0a021ba6ae69d438))
* **cli:** fallback dx.json support for find project and app ([831b267](https://github.com/digitopvn/diginext/commit/831b267243553574ba626382cd95168106972756))
* **cli:** fallback dx.json support for find project and app ([#127](https://github.com/digitopvn/diginext/issues/127)) ([cb3d229](https://github.com/digitopvn/diginext/commit/cb3d229f2bf1b102285924f2936c6c46f50597a3))
* **server:** cannot verify git provider after connecting ([e59b84a](https://github.com/digitopvn/diginext/commit/e59b84a042bfa72b99cd1533b67526e816339c39))
* **server:** when rollout skip checking ingress if ssl is none ([28f9f86](https://github.com/digitopvn/diginext/commit/28f9f8639f8cb5f1366e167e23da8a1f546e91bb))

# [3.1.0](https://github.com/digitopvn/diginext/compare/v3.0.5...v3.1.0) (2023-05-10)


### Bug Fixes

* **server, cli:** update git info while deploying app ([e914041](https://github.com/digitopvn/diginext/commit/e914041f5ca1db951dbfdbecfc3302720f71975c))
* **server, cli:** update git info while deploying app ([#126](https://github.com/digitopvn/diginext/issues/126)) ([4db5d4a](https://github.com/digitopvn/diginext/commit/4db5d4a26f4ea4457aedf49ebe50a25ee188cb85))
* **server:** app constroller git info is required ([e4fa77e](https://github.com/digitopvn/diginext/commit/e4fa77ef08c9081abeb465226feff4bc1f7877da))
* **server:** can't update app config ([355b16e](https://github.com/digitopvn/diginext/commit/355b16e6e19bcfa840dffa130cf4ffcf08c662fb))


### Features

* **admin:** connect and list connected git providers ([3018bae](https://github.com/digitopvn/diginext/commit/3018bae5eee14cc78cf33de878775aef0c40a27c))

## [3.0.5](https://github.com/digitopvn/diginext/compare/v3.0.4...v3.0.5) (2023-05-10)


### Bug Fixes

* **bitbucket repo:** issue of creating new bitbucket repo ([ee3d23b](https://github.com/digitopvn/diginext/commit/ee3d23bea6fe47ecf55384a1475568fb09d7f6a0))
* **bitbucket:** catch error when fetch api of bitbucket ([68a977a](https://github.com/digitopvn/diginext/commit/68a977a97822ccacb18084579ab7f29cada81a79))
* **build,deploy:** add cli version for tracking ([86e54ba](https://github.com/digitopvn/diginext/commit/86e54bacc61c53af8b48cbd767aed6f07c14c42c))
* **git provider:** add api connect github and bitbucket ([197a916](https://github.com/digitopvn/diginext/commit/197a916ef1252952c848c3f04b27ac87e5d24d86))
* **github:** create github repo when create new or init app ([0cb841f](https://github.com/digitopvn/diginext/commit/0cb841fdb40ff0a6df481bc9e84c1b2a9d82b67c))
* **server-info:** skip docker or podman ver if not available ([d5d2e15](https://github.com/digitopvn/diginext/commit/d5d2e15093e6ccc7086a44d58f98c705a4f1e77d))

## [3.0.5-prerelease.1](https://github.com/digitopvn/diginext/compare/v3.0.4...v3.0.5-prerelease.1) (2023-04-27)


### Bug Fixes

* **bitbucket:** catch error when fetch api of bitbucket ([68a977a](https://github.com/digitopvn/diginext/commit/68a977a97822ccacb18084579ab7f29cada81a79))
* **build,deploy:** add cli version for tracking ([86e54ba](https://github.com/digitopvn/diginext/commit/86e54bacc61c53af8b48cbd767aed6f07c14c42c))
* **git provider:** add api connect github and bitbucket ([197a916](https://github.com/digitopvn/diginext/commit/197a916ef1252952c848c3f04b27ac87e5d24d86))
* **github:** create github repo when create new or init app ([0cb841f](https://github.com/digitopvn/diginext/commit/0cb841fdb40ff0a6df481bc9e84c1b2a9d82b67c))
* **server-info:** skip docker or podman ver if not available ([d5d2e15](https://github.com/digitopvn/diginext/commit/d5d2e15093e6ccc7086a44d58f98c705a4f1e77d))

## [3.0.4](https://github.com/digitopvn/diginext/compare/v3.0.3...v3.0.4) (2023-04-20)


### Bug Fixes

* **release flow:** skip ci when update pkg ver ([eb7f348](https://github.com/digitopvn/diginext/commit/eb7f34881e833169570010f74159bca5f725ece4))

## [3.0.3](https://github.com/digitopvn/diginext/compare/v3.0.2...v3.0.3) (2023-04-20)


### Bug Fixes

* **request-deploy:** add more info to debug request deploy ([e7e3eb5](https://github.com/digitopvn/diginext/commit/e7e3eb569298bc1571d3e139e6b9216d32d01f52))

## [3.0.2](https://github.com/digitopvn/diginext/compare/v3.0.1...v3.0.2) (2023-04-20)


### Bug Fixes

* **builds:** ensure workspace string to object id ([de57d3e](https://github.com/digitopvn/diginext/commit/de57d3efa79bb6d234d4426086344197557e7924))
* **podman:** login issue with gcr.io ([77374b8](https://github.com/digitopvn/diginext/commit/77374b8fc21a6b415297dbb0e9d7d3f73d63ce19))
* **user,service_account,api_key:** drop unique index in username field ([4e7f3c3](https://github.com/digitopvn/diginext/commit/4e7f3c3404daeda9428f535b2dccdfe3a05985f0))

## [3.0.1](https://github.com/digitopvn/diginext/compare/v3.0.0...v3.0.1) (2023-04-19)


### Bug Fixes

* **package.json:** reorder semantic release plugins ([5263c77](https://github.com/digitopvn/diginext/commit/5263c7792837e97b0661d69e9006bc7093ed209c))
* **write dx config:** ignore package.json if not existed ([7b338fa](https://github.com/digitopvn/diginext/commit/7b338fa5800d5b90c812abd750095ed56d202e5a))

# [3.0.0](https://github.com/digitopvn/diginext/compare/v2.11.2...v3.0.0) (2023-04-19)


### Bug Fixes

* **app controller:** avoid deleting namespaces while deleting apps ([deb9df6](https://github.com/digitopvn/diginext/commit/deb9df60080a02b0fdc0213958f1ff1ad450cecc))
* **app controller:** should not delete namespace when deleting deploy environment ([eaa1dba](https://github.com/digitopvn/diginext/commit/eaa1dba27f9b2da3327db4970cbfdb0d2ad93f72))
* **base controller:** fix incorrect pagination in api response ([d435e2f](https://github.com/digitopvn/diginext/commit/d435e2f49bcc8922769373ec1e4eff400290056d))
* **base service:** add pre hook to set update and create time ([5d8658c](https://github.com/digitopvn/diginext/commit/5d8658c0b2d23e061a6f50cca41edd630e1c71d7))
* **base service:** fix maximum call stack size exceed ([9b9563e](https://github.com/digitopvn/diginext/commit/9b9563ebf011122789c00c7b75c9ee37f953f07d))
* **base service:** issue when traverse object and convert objectid to string ([597b762](https://github.com/digitopvn/diginext/commit/597b762b325599180857b7482912c4169245bcd4))
* **commitlint:** ignore chore commit message ([93953c4](https://github.com/digitopvn/diginext/commit/93953c4cb1405d81c207e5c6a19f84d11d8fff93))
* **create release:** resolve conflicts ([bce9294](https://github.com/digitopvn/diginext/commit/bce9294daa24391d1e0b53e1c0299f22efbb703c))
* **docker compose test:** successfully run tests in docker compose file ([95923e0](https://github.com/digitopvn/diginext/commit/95923e064dc035144d8efcb31fe65eb4b2049a19))
* **entities:** add collection name to entity models ([616b918](https://github.com/digitopvn/diginext/commit/616b91859d5d204e2cd9b8d606a9932efd60fb8a))
* **helpers:** use different db name for testing and drop test db after finish ([98f1112](https://github.com/digitopvn/diginext/commit/98f11121ed57144aa696f1fd9ffa4d9ad1ef9395))
* **project:** issue of deleting project ([c352588](https://github.com/digitopvn/diginext/commit/c3525882c9b8c8dc1ef5c045f75d08b82144f05d))
* **release workflow:** add ci github token ([b429b13](https://github.com/digitopvn/diginext/commit/b429b138b3393ab31359cf72c5363ad04611ac12))
* **release workflow:** add ci github token ([00264ff](https://github.com/digitopvn/diginext/commit/00264ff4ff78169a17b63005e86d08b2bcaa25e1))
* **release workflow:** release new version won't be published ([90b1630](https://github.com/digitopvn/diginext/commit/90b1630ff27d1022363aeffa4809f0c28ebb1019))
* **release:** try release a prerelease version and publish ([a68772a](https://github.com/digitopvn/diginext/commit/a68772af463ecac53b7c5807f6e23617d9a0a276))
* **routes:** default deleted at is null, should be undefined ([0f5a581](https://github.com/digitopvn/diginext/commit/0f5a58147dd8d2cf316b2c3d2f6523925fd2c3c0))
* **server:** default owner when create build env ([a62e420](https://github.com/digitopvn/diginext/commit/a62e420d2a5010e37408722e46b9fc3857c09dea))
* **startup script:** avoid repeated migration tasks ([c82a0a9](https://github.com/digitopvn/diginext/commit/c82a0a9155f0c1d7a2b6bdb7012020cdb1575d47))


### Code Refactoring

* **all:** migrate from typeorm to mongoose ([c17e103](https://github.com/digitopvn/diginext/commit/c17e1037458b01bcc63e69527f3aba630a31e16b))


### Features

* **release:** release 3.0.0 ([1260516](https://github.com/digitopvn/diginext/commit/12605160588e145498bda9b3bd3f1cc1f85178e9))
* **server:** add api check status build ([563ab11](https://github.com/digitopvn/diginext/commit/563ab11f2bfb629000d66ba63611e2e30c90e821))


### Reverts

* **all:** use mongo objectid instead of typeorm objectid ([8e21710](https://github.com/digitopvn/diginext/commit/8e21710a5377eac0c5bc43f727c5491e21e4c66f))


### BREAKING CHANGES

* **all:** migrate from typeorm to mongoose

# [3.0.0-prerelease.3](https://github.com/digitopvn/diginext/compare/v3.0.0-prerelease.2...v3.0.0-prerelease.3) (2023-04-19)


### Bug Fixes

* **create release:** resolve conflicts ([bce9294](https://github.com/digitopvn/diginext/commit/bce9294daa24391d1e0b53e1c0299f22efbb703c))
* **server:** default owner when create build env ([a62e420](https://github.com/digitopvn/diginext/commit/a62e420d2a5010e37408722e46b9fc3857c09dea))


### Features

* **server:** add api check status build ([563ab11](https://github.com/digitopvn/diginext/commit/563ab11f2bfb629000d66ba63611e2e30c90e821))

# [3.0.0-prerelease.2](https://github.com/digitopvn/diginext/compare/v3.0.0-prerelease.1...v3.0.0-prerelease.2) (2023-04-19)


### Bug Fixes

* **release:** try release a prerelease version and publish ([a68772a](https://github.com/digitopvn/diginext/commit/a68772af463ecac53b7c5807f6e23617d9a0a276))

# [3.0.0-prerelease.1](https://github.com/digitopvn/diginext/compare/v2.11.2...v3.0.0-prerelease.1) (2023-04-19)


### Bug Fixes

* **app controller:** avoid deleting namespaces while deleting apps ([deb9df6](https://github.com/digitopvn/diginext/commit/deb9df60080a02b0fdc0213958f1ff1ad450cecc))
* **app controller:** should not delete namespace when deleting deploy environment ([eaa1dba](https://github.com/digitopvn/diginext/commit/eaa1dba27f9b2da3327db4970cbfdb0d2ad93f72))
* **base controller:** fix incorrect pagination in api response ([d435e2f](https://github.com/digitopvn/diginext/commit/d435e2f49bcc8922769373ec1e4eff400290056d))
* **base service:** add pre hook to set update and create time ([5d8658c](https://github.com/digitopvn/diginext/commit/5d8658c0b2d23e061a6f50cca41edd630e1c71d7))
* **base service:** fix maximum call stack size exceed ([9b9563e](https://github.com/digitopvn/diginext/commit/9b9563ebf011122789c00c7b75c9ee37f953f07d))
* **base service:** issue when traverse object and convert objectid to string ([597b762](https://github.com/digitopvn/diginext/commit/597b762b325599180857b7482912c4169245bcd4))
* **commitlint:** ignore chore commit message ([93953c4](https://github.com/digitopvn/diginext/commit/93953c4cb1405d81c207e5c6a19f84d11d8fff93))
* **docker compose test:** successfully run tests in docker compose file ([95923e0](https://github.com/digitopvn/diginext/commit/95923e064dc035144d8efcb31fe65eb4b2049a19))
* **entities:** add collection name to entity models ([616b918](https://github.com/digitopvn/diginext/commit/616b91859d5d204e2cd9b8d606a9932efd60fb8a))
* **helpers:** use different db name for testing and drop test db after finish ([98f1112](https://github.com/digitopvn/diginext/commit/98f11121ed57144aa696f1fd9ffa4d9ad1ef9395))
* **project:** issue of deleting project ([c352588](https://github.com/digitopvn/diginext/commit/c3525882c9b8c8dc1ef5c045f75d08b82144f05d))
* **release workflow:** release new version won't be published ([90b1630](https://github.com/digitopvn/diginext/commit/90b1630ff27d1022363aeffa4809f0c28ebb1019))
* **routes:** default deleted at is null, should be undefined ([0f5a581](https://github.com/digitopvn/diginext/commit/0f5a58147dd8d2cf316b2c3d2f6523925fd2c3c0))
* **startup script:** avoid repeated migration tasks ([c82a0a9](https://github.com/digitopvn/diginext/commit/c82a0a9155f0c1d7a2b6bdb7012020cdb1575d47))


### Code Refactoring

* **all:** migrate from typeorm to mongoose ([c17e103](https://github.com/digitopvn/diginext/commit/c17e1037458b01bcc63e69527f3aba630a31e16b))


### Reverts

* **all:** use mongo objectid instead of typeorm objectid ([8e21710](https://github.com/digitopvn/diginext/commit/8e21710a5377eac0c5bc43f727c5491e21e4c66f))


### BREAKING CHANGES

* **all:** migrate from typeorm to mongoose

## [2.11.2](https://github.com/digitopvn/diginext/compare/v2.11.1...v2.11.2) (2023-04-12)


### Bug Fixes

* **all:** use tohexstring to convert object id to string ([976b501](https://github.com/digitopvn/diginext/commit/976b50131d849b9777ab299946a46d15473844cf))
* **server:** add activity log and fix missing id when parse request filter ([b20c916](https://github.com/digitopvn/diginext/commit/b20c916ea62011dedb6d07ffcb5df6bdb5d6d60f))
* **server:** issue of duplicated roles when seeding default workspace roles ([2a46a78](https://github.com/digitopvn/diginext/commit/2a46a785d6d28b1b3082742afc8115d782da0482))

## [2.11.1](https://github.com/digitopvn/diginext/compare/v2.11.0...v2.11.1) (2023-04-12)


### Bug Fixes

* **server:** [hotfix] auto parse json in controllers ([5ba3017](https://github.com/digitopvn/diginext/commit/5ba30177a1a7912ccce50a30bb03ddb6877bc5c6))
* **server:** default framework typo issue ([ae40b49](https://github.com/digitopvn/diginext/commit/ae40b49e26c05723a33cd9bf399abc35a156c4f5))
* **server:** issue of seeding default frameworks when create workspace ([0534ac2](https://github.com/digitopvn/diginext/commit/0534ac28b5b05e05c3d1f2ec3497bc88863ec54d))

# [2.11.0](https://github.com/digitopvn/diginext/compare/v2.10.1...v2.11.0) (2023-04-12)


### Bug Fixes

* **server:** check active workspace when authentication ([890ff67](https://github.com/digitopvn/diginext/commit/890ff67b54cad87ba86a4fa00e78c21654b65e17))
* **server:** check required stack installation when adding new clusters ([190377b](https://github.com/digitopvn/diginext/commit/190377b1fe6a48b4e2f7fbe4950fb7bbfcab2573))
* **server:** issue of seeding incorrect default api key ([593a490](https://github.com/digitopvn/diginext/commit/593a490fd3b476f4a33886e9bceba5ceb66c5681))
* **server:** mask some sensitive info to member role ([c4f93f7](https://github.com/digitopvn/diginext/commit/c4f93f7aa91825c993ed893f82a8bf4b5af58127))
* **server:** respond empty for sensitive info ([a0e846e](https://github.com/digitopvn/diginext/commit/a0e846ee6d430481247ac1f32c38fe5b04cda96c))
* **server:** set default moderator role to service account and api key when   create ws ([f838783](https://github.com/digitopvn/diginext/commit/f838783d857a7cfafb5b274500b325f3c5eafd83))


### Features

* **server and admin:** workspace privacy switching ([2a2fed8](https://github.com/digitopvn/diginext/commit/2a2fed898595e95b0a84fb5311b0dedcd76f5346))

## [2.10.1](https://github.com/digitopvn/diginext/compare/v2.10.0...v2.10.1) (2023-04-09)


### Bug Fixes

* **server:** container registry controller - fix create and update data validation ([5d103a3](https://github.com/digitopvn/diginext/commit/5d103a3f073d10f0ab76c3541e014d9f4d572851))

# [2.10.0](https://github.com/digitopvn/diginext/compare/v2.9.2...v2.10.0) (2023-04-08)


### Bug Fixes

* **cli:** set default host when adding new container registry ([9837c16](https://github.com/digitopvn/diginext/commit/9837c1674768db05140da058d754706c2103abd3))
* **cli:** set or confirm default host when adding new container registry ([40da946](https://github.com/digitopvn/diginext/commit/40da94636daa1b8976e2dac595defb2ab3e03108))


### Features

* **cli:** support docker container registry: add, connect, create image pull secrets ([bb3792e](https://github.com/digitopvn/diginext/commit/bb3792e87c10b599e5004b68a92cfc4939a6f1ad))

## [2.9.2](https://github.com/digitopvn/diginext/compare/v2.9.1...v2.9.2) (2023-04-07)


### Bug Fixes

* **cli:** update diginext site url to diginext.vn ([f5fe0d7](https://github.com/digitopvn/diginext/commit/f5fe0d787ee1e0c28a674decf88bc06f02c3620a))

## [2.9.1](https://github.com/digitopvn/diginext/compare/v2.9.0...v2.9.1) (2023-04-07)


### Bug Fixes

* **cli:** issue of duplicated tls ingress when generate ingress yaml ([563709f](https://github.com/digitopvn/diginext/commit/563709fc248078cdaa7d758d2451984407114bb6))
* **server and cli:** leave empty to generate tls secret automatically if using letsencrypt issuer ([ba5d235](https://github.com/digitopvn/diginext/commit/ba5d23509352b18f8e49a81fffa622877d176adc))

# [2.9.0](https://github.com/digitopvn/diginext/compare/v2.8.13...v2.9.0) (2023-04-07)


### Bug Fixes

* **server:** issue of missing permissions in default moderator role ([2237208](https://github.com/digitopvn/diginext/commit/2237208313a52eab1c63e1dce432cd0a8747b02a))
* **server:** prevent overriding git global config when developing diginext ([f64b108](https://github.com/digitopvn/diginext/commit/f64b108d79c2e0f78d10821a7654046d6fbecffc))
* **server:** update default member role should not access server key and api token ([8615c89](https://github.com/digitopvn/diginext/commit/8615c892dc03e3b32aeb353b683ca054c1b64c02))


### Features

* **cli:** git - github auth, profile, support github helper commands ([f4bd969](https://github.com/digitopvn/diginext/commit/f4bd969da53c1c1b13ea719ecd0059860a99e802))

## [2.8.13](https://github.com/digitopvn/diginext/compare/v2.8.12...v2.8.13) (2023-04-07)


### Bug Fixes

* **admin:** add create or select workspace page ([e6c8e5c](https://github.com/digitopvn/diginext/commit/e6c8e5cd2bcddae6d9fcbfd7f79dc0398af92507))
* **admin:** show public key in workspace settings ([d6eefc5](https://github.com/digitopvn/diginext/commit/d6eefc5b3a37747b3daa35a265838e7a2f8f0187))
* **cli and server:** move workspace creation to admin ui completly ([d13964a](https://github.com/digitopvn/diginext/commit/d13964a624046eff5de4b799e0278e7ebdb1ec68))
* **cli:** add select resource size when deploy app ([d978173](https://github.com/digitopvn/diginext/commit/d978173e043a327a3ff0ac24f530a722547c79ac))
* **cli:** parse options and write deploy environment to dx json ([332f928](https://github.com/digitopvn/diginext/commit/332f928db999b0721ccdc5bfa16b780dbfec922a))
* **server:** add routes controller and api ([cff894b](https://github.com/digitopvn/diginext/commit/cff894b9943620704c67afe14d43f46021f48d9b))
* **server:** build - add log message when cloning source code ([ec85b76](https://github.com/digitopvn/diginext/commit/ec85b7657f222df0ba6da7fe2fa29df1668963a3))
* **server:** build - delete app cache dir when cloning new source code ([37bdd61](https://github.com/digitopvn/diginext/commit/37bdd619148476d55d6934dc3dbb5ff18c5a28ca))
* **server:** expose user profile api ([4a451c3](https://github.com/digitopvn/diginext/commit/4a451c31416a775d1e929e0d9d0550b20df447ce))
* **server:** fix login api logic to select and create workspace if needed ([f7bb9e3](https://github.com/digitopvn/diginext/commit/f7bb9e3d7b82ba09625ea02c89ce9aa54e4b7bfc))
* **server:** make log of authorization looks clearer ([7d98f1e](https://github.com/digitopvn/diginext/commit/7d98f1e4be55b351ec04fc862b854d81591aa3f5))
* **server:** missing controller registration in workspace route ([ed5c1e1](https://github.com/digitopvn/diginext/commit/ed5c1e11014b051d24af3ca57bd994398ee91209))
* **server:** optimize parsed data from request to register controller middleware ([c230419](https://github.com/digitopvn/diginext/commit/c23041951c317d50d05e2ce13b1e6e8ff9b3db03))
* **server:** seed initial data when creating a new workspace ([dd84ebc](https://github.com/digitopvn/diginext/commit/dd84ebc4c290d621f0c3a9f4c96d3cd8a2f8fad6))

## [2.8.12](https://github.com/digitopvn/diginext/compare/v2.8.11...v2.8.12) (2023-04-04)


### Bug Fixes

* **cli:** issue: cannot pull framework when create new app ([175b930](https://github.com/digitopvn/diginext/commit/175b9309ea92dd83d90fa5bb5cf65935ddf0d4b5))
* **server and cli:** correct home directory when generate ssh keys ([4a2c203](https://github.com/digitopvn/diginext/commit/4a2c203207e191a7e231521458197b536d30c27b))
* **server:** delete current prerelease deployments when preview a release ([aec5f43](https://github.com/digitopvn/diginext/commit/aec5f43b66ea69147f89294aa776e630354e8531))
* **server:** error checking in release controller ([e6e18a4](https://github.com/digitopvn/diginext/commit/e6e18a48118bd55f5d9e13e2dec2d52589745368))
* **template:** remove secrets ([b7878c7](https://github.com/digitopvn/diginext/commit/b7878c73fe1879e1dcd48bb5d1331a88dab2c4ed))

## [2.8.11](https://github.com/digitopvn/diginext/compare/v2.8.10...v2.8.11) (2023-04-04)


### Bug Fixes

* **admin:** build list: add env to roll out build api call ([db4af38](https://github.com/digitopvn/diginext/commit/db4af38ab80da37ab7f8c1ad2e67dc88654438e3))
* **server:** correct owner of release when create from a build ([ad207b9](https://github.com/digitopvn/diginext/commit/ad207b9271d346306c09c478f7183b6cf17f217b))
* **server:** use workspace id to create release from build ([505f8c5](https://github.com/digitopvn/diginext/commit/505f8c59c13082297d2abf8917c20d188ca801c9))

## [2.8.10](https://github.com/digitopvn/diginext/compare/v2.8.9...v2.8.10) (2023-04-04)


### Bug Fixes

* **admin:** add profile page ([6fa1056](https://github.com/digitopvn/diginext/commit/6fa10564451992794ecd7c25e254d673869dde5f))
* **server and admin:** improve ux when create or update cluster ([d523acb](https://github.com/digitopvn/diginext/commit/d523acbac420cf9abe0c5eab5b44ad50bdf98024))
* **server:** add member permissions to release and build api ([acf421e](https://github.com/digitopvn/diginext/commit/acf421e5e713d6257ffcfa0620b02e0a19c6b71f))
* **server:** generate domain on server will not use api but direct function ([e47ec5c](https://github.com/digitopvn/diginext/commit/e47ec5ce154aa37ae27e4b42975f6902c0cd60d7))
* **server:** workspace id is string issue when create new build ([aef411e](https://github.com/digitopvn/diginext/commit/aef411e45c9dbc0091483228c3c429fd2b62102d))

## [2.8.9](https://github.com/digitopvn/diginext/compare/v2.8.8...v2.8.9) (2023-04-03)


### Bug Fixes

* **cli and server:** deploy issue of unauthorized, missing route permisions ([9af10b5](https://github.com/digitopvn/diginext/commit/9af10b5563597948a4738321869d9d3b3ca82aef))
* **cli:** login is missing workspaces ([7de65a2](https://github.com/digitopvn/diginext/commit/7de65a2527d95562a7dcb73544b94123764d4bf4))
* **server:** delete existing ingress rule if any when deploy ([892bc46](https://github.com/digitopvn/diginext/commit/892bc4630c935b4d042903750514903fea6e99d5))

## [2.8.8](https://github.com/digitopvn/diginext/compare/v2.8.7...v2.8.8) (2023-04-03)


### Bug Fixes

* **admin:** assign role to users ([0e2272d](https://github.com/digitopvn/diginext/commit/0e2272db3ecb198f34f63c4629a6f707c450820c))
* **server:** filter user roles by workspace and assign new role to user ([e10298b](https://github.com/digitopvn/diginext/commit/e10298ba9faf5a607336d07511f86c13dcb561f3))
* **server:** migrate and assign role to user ([913c743](https://github.com/digitopvn/diginext/commit/913c743d9dc59b36629eb6afc0c3a0beb8133e2e))
* **server:** register controller for all api routes ([678826f](https://github.com/digitopvn/diginext/commit/678826f04b91b9d33b3b0a8a8e49d0f3498f9411))

## [2.8.7](https://github.com/digitopvn/diginext/compare/v2.8.6...v2.8.7) (2023-03-31)


### Bug Fixes

* **admin:** change api to fetch build logs ([6f4fb88](https://github.com/digitopvn/diginext/commit/6f4fb883b8c38c242c0743d633523d8148054966))
* **admin:** display error message when authorization failure ([2bd861e](https://github.com/digitopvn/diginext/commit/2bd861e1fd45f8ab53d0bd92232735d4fca52dbd))
* **cli and server:** generate domain, process api middleware, init failed old app ([fa682ad](https://github.com/digitopvn/diginext/commit/fa682ad95249bbe636b09c13304c5dfc45627c8f))
* **cli and server:** issue of uploading dotenv file to prod environment ([c0eff35](https://github.com/digitopvn/diginext/commit/c0eff355abecc30d38e0fad0aaf36b879c5eec38))
* **cli:** re-generate domain with app slug if domain length is over 64 chars ([301f6e1](https://github.com/digitopvn/diginext/commit/301f6e1f266d6f17b4d45802030cb2e4f688024b))
* **server:** add authorization to app controller ([2251595](https://github.com/digitopvn/diginext/commit/22515954e0ab64342d45fa6051df3981ed3a7f89))
* **server:** apply rbac middleware to all api routes ([a6225a8](https://github.com/digitopvn/diginext/commit/a6225a8099b9a43932dbbba8f6a84678bb82614c))
* **server:** limit in pagination should be number ([a0d0d51](https://github.com/digitopvn/diginext/commit/a0d0d510462c69dd0faa68cf836282e4baf03bb5))
* **server:** print content of yaml if deploy error ([43d3238](https://github.com/digitopvn/diginext/commit/43d3238fa1813309b52065fe2e6d22c5de9aee3a))

## [2.8.6](https://github.com/digitopvn/diginext/compare/v2.8.5...v2.8.6) (2023-03-30)


### Bug Fixes

* **cli:** upload dot env file first time deploy as default ([4412c50](https://github.com/digitopvn/diginext/commit/4412c50f3678bdaf4862f4b94f93c830bc5c2c6c))
* **cli:** validate cluster before requesting deployment ([e8e9a5e](https://github.com/digitopvn/diginext/commit/e8e9a5e3bff61244404b5b5e7da77f591e0a9fed))
* **server:** issue of git pulling cache previous build ([873eead](https://github.com/digitopvn/diginext/commit/873eead16413cac6ec3890cb077bf13812cd1de6))

## [2.8.5](https://github.com/digitopvn/diginext/compare/v2.8.4...v2.8.5) (2023-03-30)


### Bug Fixes

* **clean up:** remove logging messages ([cb1eb24](https://github.com/digitopvn/diginext/commit/cb1eb2458f05695a8f490d24c859bc5ba51a9227))
* **server:** api user list all incorrect filter ([56c4d7c](https://github.com/digitopvn/diginext/commit/56c4d7c875872cbbf605928ee0407141e064b519))
* **server:** set active workspace in jwt verification ([f12e71a](https://github.com/digitopvn/diginext/commit/f12e71a5815a11081ea8d75c1bb3f8e9bd7fc31d))

## [2.8.4](https://github.com/digitopvn/diginext/compare/v2.8.3...v2.8.4) (2023-03-30)


### Bug Fixes

* **server:** add deploy from source code api ([5d74ffb](https://github.com/digitopvn/diginext/commit/5d74ffbbe5002dbb6b5e29ae3a8f718bd29d004f))
* **server:** issue of incorrect login access token ([4867b26](https://github.com/digitopvn/diginext/commit/4867b26fed1f055e7285b8c1640a3cc2e4b7aa1f))

## [2.8.3](https://github.com/digitopvn/diginext/compare/v2.8.2...v2.8.3) (2023-03-29)


### Bug Fixes

* **server:** config global user for git commands ([c9c2552](https://github.com/digitopvn/diginext/commit/c9c2552811d6a6af73427a0351eeffb1b3feab02))
* **server:** setup global identity for git config ([5cbbe8d](https://github.com/digitopvn/diginext/commit/5cbbe8d293525beb903b22db6b60337e97c021ef))

## [2.8.2](https://github.com/digitopvn/diginext/compare/v2.8.1...v2.8.2) (2023-03-29)


### Bug Fixes

* **server:** optimizing isEmpty validation ([0a0e62d](https://github.com/digitopvn/diginext/commit/0a0e62dfdf3ee44854ba83db11bb6d346a956ac2))
* **server:** source git pull now using --no-ff ([0911edc](https://github.com/digitopvn/diginext/commit/0911edccf6b8417019a0a9d0a1ab81815c6c32d9))

## [2.8.1](https://github.com/digitopvn/diginext/compare/v2.8.0...v2.8.1) (2023-03-29)


### Bug Fixes

* **server:** issue of project validation when deploying ([c4774c1](https://github.com/digitopvn/diginext/commit/c4774c1e396e0c69018cc96ca1e3a347e92a0cde))
* **server:** lodash isEmpty is not validating properly ([3bcbb4b](https://github.com/digitopvn/diginext/commit/3bcbb4bb4e333e9733f5a6ba5a61501b27cb7b1a))

# [2.8.0](https://github.com/digitopvn/diginext/compare/v2.7.0...v2.8.0) (2023-03-29)


### Bug Fixes

* **admin:** remove unneccessary info of cloud providers ([713d41d](https://github.com/digitopvn/diginext/commit/713d41dbdf0cc88a95e066a268265ac183d4bbe3))
* **server:** issue of cluster validation when creating new ([0830337](https://github.com/digitopvn/diginext/commit/0830337243a415cdae7c6031f638154de73216b3))
* **server:** migrate default roles for all workspaces ([a09a92e](https://github.com/digitopvn/diginext/commit/a09a92e07beb1d9cd5fe892a5271cd0937d341e4))


### Features

* **server:** create default roles and assign to workspace members ([7930c11](https://github.com/digitopvn/diginext/commit/7930c11f64f679ce2ea68b5da4e393fbf96a8c11))

# [2.7.0](https://github.com/digitopvn/diginext/compare/v2.6.6...v2.7.0) (2023-03-27)


### Bug Fixes

* **admin:** display api key access token in workspace setting ([e3c0751](https://github.com/digitopvn/diginext/commit/e3c07518294da23df537b662f7e4c4c4a821f616))
* **cli token:** fix empty token in profile api ([4621899](https://github.com/digitopvn/diginext/commit/462189945098d4edb32bc83acc4a7ffce803d9e3))
* **server:** issue of missing params when create new app ([91bf189](https://github.com/digitopvn/diginext/commit/91bf189b35138b3f21063fb47048333a13ce6b77))


### Features

* **cli and server:** simplify app creation ([9d43299](https://github.com/digitopvn/diginext/commit/9d43299f0c3398e3ed690c751764cfaf0c362ae0))
* **server:** implement service account and api key for workspace api access ([4802aa0](https://github.com/digitopvn/diginext/commit/4802aa0a36f6a9346daa737e63945377f9c59251))

## [2.6.6](https://github.com/digitopvn/diginext/compare/v2.6.5...v2.6.6) (2023-03-26)


### Bug Fixes

* **admin:** display api access token in workspace settings ([219c0cc](https://github.com/digitopvn/diginext/commit/219c0cc8a6efa39feac67fb71b4bd92a1daa4243))
* **server:** generate domain for create new deploy environment in app controller ([241029c](https://github.com/digitopvn/diginext/commit/241029ca0241208fb678e61286eed512d1555de6))
* **server:** simplify app deploy environment api input params ([644fec6](https://github.com/digitopvn/diginext/commit/644fec6201f4c6bc8998d2b55060a6b89542ffe8))

## [2.6.5](https://github.com/digitopvn/diginext/compare/v2.6.4...v2.6.5) (2023-03-25)


### Bug Fixes

* **server:** issue of logger is cutting messages ([fe183d1](https://github.com/digitopvn/diginext/commit/fe183d1a19f2e63edad8edba3a1370b5d8331b95))

## [2.6.4](https://github.com/digitopvn/diginext/compare/v2.6.3...v2.6.4) (2023-03-25)


### Bug Fixes

* **server api:** split build and deploy api to seperate process ([ed40148](https://github.com/digitopvn/diginext/commit/ed40148fb469d44bfefba6a1405e9ae36cde8c10))

## [2.6.3](https://github.com/digitopvn/diginext/compare/v2.6.2...v2.6.3) (2023-03-22)


### Bug Fixes

* **cli:** deploy: throw error message when validate port ([e23d638](https://github.com/digitopvn/diginext/commit/e23d638c192a660aadd11fe294b75f3e2907b8e9))
* **cli:** issue of port is not a number ([9b6faaf](https://github.com/digitopvn/diginext/commit/9b6faaf304745051fbed5995df1ff21ca34b5c06))
* **cli:** use lodash to detect port is not a number ([8398560](https://github.com/digitopvn/diginext/commit/83985601b6d6555f9c453c91ab03eab106e467ad))
* **examples:** docker compose development examples with persistent data and hot reload ([10d8b58](https://github.com/digitopvn/diginext/commit/10d8b5882e6ea04d4e8a314d6a56e9e65e8b3cb6))
* **server:** git ssh api and git module with create, generate, verify, get public key ([7c8fb4f](https://github.com/digitopvn/diginext/commit/7c8fb4f061518273b04bb403372dffcfbaa41104))
* **server:** improve ingress config apply error message ([422db23](https://github.com/digitopvn/diginext/commit/422db2323beba1c37bc4a134198dd42e35b4f11c))

## [2.6.2](https://github.com/digitopvn/diginext/compare/v2.6.1...v2.6.2) (2023-03-16)


### Bug Fixes

* **server:** correct image pull secret name ([80a2ae7](https://github.com/digitopvn/diginext/commit/80a2ae77544e9265c8e32984bb608314e6faf3b4))

## [2.6.1](https://github.com/digitopvn/diginext/compare/v2.6.0...v2.6.1) (2023-03-15)


### Bug Fixes

* **server:** create namespace and imagepullsecrets before building ([e0459b2](https://github.com/digitopvn/diginext/commit/e0459b2577a34df24d01c22aae2fdea38d3b2d6a))
* **server:** generate and verify ssh private keys ([b8d5a00](https://github.com/digitopvn/diginext/commit/b8d5a002842effc056d22ce2be64d057b051baf1))
* **server:** wrong platform args when build with docker buildx ([6d67cc0](https://github.com/digitopvn/diginext/commit/6d67cc003ca7b4015d749ef8ebd39c983c76fd07))

# [2.6.0](https://github.com/digitopvn/diginext/compare/v2.5.6...v2.6.0) (2023-03-15)


### Bug Fixes

* **builder:** refactor builder ([fb83bc3](https://github.com/digitopvn/diginext/commit/fb83bc34e82b962d6d7c3465b25b2ba8e133c9c5))
* **cli:** issue of resolving dockerfile ([b28a577](https://github.com/digitopvn/diginext/commit/b28a577c9608294f4f45cc9ba8364a3828d50603))
* **dev environment:** setup docker compose for dev environment ([402e48d](https://github.com/digitopvn/diginext/commit/402e48d50b04daa61aa8fa9e56032a658c72ebb9))
* **docker compose:** setup docker compose for podman builder ([8213aa6](https://github.com/digitopvn/diginext/commit/8213aa66a0e3262730a0352b0bb3f2981c6ca872))
* **gcloud auth:** rm auth file after success authenticate ([9698c93](https://github.com/digitopvn/diginext/commit/9698c934f26995bef68be78565a70c20e60b5cb9))
* **podman:** failed: try to make podman work in rootless mode ([d5ea889](https://github.com/digitopvn/diginext/commit/d5ea889e6b499dbd5c0f0e2b28c935b97ad73306))
* **registry auth:** podman login when authenticate container registries ([0525824](https://github.com/digitopvn/diginext/commit/0525824f9be1847e06cebbd4041b6411140d0d69))
* **rm git cache:** rm git cache ([3b899fb](https://github.com/digitopvn/diginext/commit/3b899fb1a3e2a3f6e1a8d68c93baa1c395c5c075))
* **server:** incorrect env vars of prerelease and prod ([895fe9b](https://github.com/digitopvn/diginext/commit/895fe9b6b6e8da68bc0fe54dfc43bf264ad45ff9))


### Features

* **podman:** add podman as primary builder ([b49eb63](https://github.com/digitopvn/diginext/commit/b49eb63cc6b27e13f2f7563ea592ce87a9813903))

## [2.5.6](https://github.com/digitopvn/diginext/compare/v2.5.5...v2.5.6) (2023-03-15)


### Bug Fixes

* **cli:** disable debug logs ([4b1d549](https://github.com/digitopvn/diginext/commit/4b1d549104ab326007e76ddcae08465e5606a65f))

## [2.5.5](https://github.com/digitopvn/diginext/compare/v2.5.4...v2.5.5) (2023-03-15)


### Bug Fixes

* **server:** undefined app response when process updating ([0ce2ad5](https://github.com/digitopvn/diginext/commit/0ce2ad522c8631c69ec813b14aa27dd7d6e08413)), closes [#52](https://github.com/digitopvn/diginext/issues/52)

## [2.5.4](https://github.com/digitopvn/diginext/compare/v2.5.3...v2.5.4) (2023-03-15)


### Bug Fixes

* **cli and server:** fix cli init app and server roll out image pull secret ([dc84e3b](https://github.com/digitopvn/diginext/commit/dc84e3b2a93e1515711c948ed1e15c7d4319ffc6))
* **server: cluster, registry:** add more validations to cluster and registry controllers ([193c567](https://github.com/digitopvn/diginext/commit/193c56728d9a457c1cc953648f602a9313e075a4))
* **utilities:** check recommended resources installed such as cert manager and nginx ingress ([5e735cc](https://github.com/digitopvn/diginext/commit/5e735cc7493b2e2f45f66f301a8acecf3c0f5eeb))

## [2.5.3](https://github.com/digitopvn/diginext/compare/v2.5.2...v2.5.3) (2023-03-09)


### Bug Fixes

* **admin ui:** add app environment variables modification feature ([4c02493](https://github.com/digitopvn/diginext/commit/4c02493b625686fb2b1c80c39a05f15aab53f0d6))
* **cli commands:** add get set delete commands to cluster and kubectl ([2142386](https://github.com/digitopvn/diginext/commit/2142386682567a3392e9d4848e36171121116757))

## [2.5.2](https://github.com/digitopvn/diginext/compare/v2.5.1...v2.5.2) (2023-03-09)


### Bug Fixes

* **cli cluster:** add command to connect cluster to local machine ([e20e9e0](https://github.com/digitopvn/diginext/commit/e20e9e020fb68517396eb8438dafa127d5e0e746))
* **cli kubectl:** issue of escaping value of env var when set env var to deployment ([a17fdb4](https://github.com/digitopvn/diginext/commit/a17fdb48e69b3e025daed1ece2c49c82396e6b88))

## [2.5.1](https://github.com/digitopvn/diginext/compare/v2.5.0...v2.5.1) (2023-03-09)


### Bug Fixes

* **cli kb:** add dx kb set deploy and improve dx registry allow ([18a2a84](https://github.com/digitopvn/diginext/commit/18a2a84a99d2cdbdda36f83e68bf59c3d5aed815))
* **server generate depploy:** issue of generate resource quota from container size ([96d6249](https://github.com/digitopvn/diginext/commit/96d6249b761496beac3e25cd677841fd99ececf0))

# [2.5.0](https://github.com/digitopvn/diginext/compare/v2.4.9...v2.5.0) (2023-03-08)


### Bug Fixes

* **server kubectl scale:** issue of missing context when run kubectl scale ([f752565](https://github.com/digitopvn/diginext/commit/f752565fe46c54fd7ca16bbc002b5b464f05011e))
* **server kubectl:** set and unset env variables with kubectl ([6b8fb9c](https://github.com/digitopvn/diginext/commit/6b8fb9c1f49cdbdd5d2125bb2103b98386ee0a92))


### Features

* **cli deploy:** add flag --fresh to deploy app from scratch ([1431aa4](https://github.com/digitopvn/diginext/commit/1431aa49cda3c92ea89fe4238f8110121741721f))

## [2.4.9](https://github.com/digitopvn/diginext/compare/v2.4.8...v2.4.9) (2023-03-08)


### Bug Fixes

* **api env vars:** add create and update env vars on deploy environment of app ([77d9337](https://github.com/digitopvn/diginext/commit/77d933716aec03d5f5d7819870da517746401a16))
* **check for update:** better warning logs ([b3a6ccd](https://github.com/digitopvn/diginext/commit/b3a6ccd2a729e65c4eaec37d348a2b92900b5f8f))
* **cluster manager:** add some utilities and k8s command into cluster manager ([eb96726](https://github.com/digitopvn/diginext/commit/eb967268c702fdff1f6dfa13a5be2c995b014c7f))
* **kube deploy:** issue of incorrect context when roll out and preview ([13916c2](https://github.com/digitopvn/diginext/commit/13916c2b22069a14c67b900a4ee9016ec3164bfc))

## [2.4.8](https://github.com/digitopvn/diginext/compare/v2.4.7...v2.4.8) (2023-03-07)


### Bug Fixes

* **ask deploy environment:** issue of update app deploy environmentt to db ([856884c](https://github.com/digitopvn/diginext/commit/856884c9398efadecc9cbe0123f55cb05d103b42))
* **readme:** update momo button png ([52fd933](https://github.com/digitopvn/diginext/commit/52fd933f6a8046e2ef7b0e74a8f9d4b8960bd17e))

## [2.4.7](https://github.com/digitopvn/diginext/compare/v2.4.6...v2.4.7) (2023-03-07)


### Bug Fixes

* **cluster auth:** skip cluster auth if it is existed in kubeconfig ([e65c6aa](https://github.com/digitopvn/diginext/commit/e65c6aa5dd55ebfa4aea6637b2c052b635076b05))
* **kube config:** log error if kube context not found ([6e6bbbb](https://github.com/digitopvn/diginext/commit/6e6bbbb30adc5cc5caa3bf887ac3d157f644a54c))
* **kube deploy:** issue of kubernetes context not found when deploy custom cluster ([4bd7318](https://github.com/digitopvn/diginext/commit/4bd7318c7564796a1c68cbfd13876be9dd65457a))
* **start build:** issue of resolving dockerfile in source code ([22e674a](https://github.com/digitopvn/diginext/commit/22e674a139d12acd522468510a0590694783e742))

## [2.4.6](https://github.com/digitopvn/diginext/compare/v2.4.5...v2.4.6) (2023-03-06)


### Bug Fixes

* **admin ui:** base api url still fall to localhost ([31a3730](https://github.com/digitopvn/diginext/commit/31a3730fdef0b9ab037ebb8de1ceda32db479de6))
* **admin ui:** issue of api base path redirect to localhost ([e4ca5b9](https://github.com/digitopvn/diginext/commit/e4ca5b9e0d8aa22c43b501e8d73caad670394271))
* **cli options:** add flag --fresh for deploy from scratch ([12aface](https://github.com/digitopvn/diginext/commit/12afaced02824f43db0e2be59ac52f07d35ed90b))
* **image pull secrets:** issue of create image pull secrets in namespace of cluster ([f7eb4ae](https://github.com/digitopvn/diginext/commit/f7eb4ae3830d341f19eed2cb6aad78915b02f635))

## [2.4.5](https://github.com/digitopvn/diginext/compare/v2.4.4...v2.4.5) (2023-03-06)


### Bug Fixes

* **cli and admin:** minor issues of admin and cli deploy domain correction ([46b74e3](https://github.com/digitopvn/diginext/commit/46b74e31fe6ea9dcc42f5ab6794abaaf486b9bfb))

## [2.4.4](https://github.com/digitopvn/diginext/compare/v2.4.3...v2.4.4) (2023-03-05)


### Bug Fixes

* **server generate deploy:** issue of empty env vars when deploy prod ([05754cd](https://github.com/digitopvn/diginext/commit/05754cdde1c1810e2dbe328c8cad8a46e6233c54))

## [2.4.3](https://github.com/digitopvn/diginext/compare/v2.4.2...v2.4.3) (2023-03-05)


### Bug Fixes

* **cli git:** try to fix git directory path in windows ([be62e89](https://github.com/digitopvn/diginext/commit/be62e897907c69610307a5b5e6e1aa299c4de258))

## [2.4.2](https://github.com/digitopvn/diginext/compare/v2.4.1...v2.4.2) (2023-03-05)


### Bug Fixes

* **cli git:** issue failed to get git info on windows ([3b40acc](https://github.com/digitopvn/diginext/commit/3b40acc72c4bfb55529afa4d78aad2b0c595c583))

## [2.4.1](https://github.com/digitopvn/diginext/compare/v2.4.0...v2.4.1) (2023-03-05)


### Bug Fixes

* **request deploy:** git provider is undefined when request deploy ([394203a](https://github.com/digitopvn/diginext/commit/394203a0bf38cd1c3498b3ff054bd72431180a85))

# [2.4.0](https://github.com/digitopvn/diginext/compare/v2.3.4...v2.4.0) (2023-03-05)


### Bug Fixes

* **generate deployment:** remove fallback support when reading deployment env vars ([1a7876f](https://github.com/digitopvn/diginext/commit/1a7876fd7978e52e7eaa8d2ee634365ad681f865))
* **git access:** verify git provider access at start up ([469ec1f](https://github.com/digitopvn/diginext/commit/469ec1f33f77329bd4016e484d43b6ba9a69a5f6))
* **git pull:** git pull cache issue ([16c4558](https://github.com/digitopvn/diginext/commit/16c4558b807fa1a1154b893540c031d8cfd1f7f2))
* **request deploy:** compare local domains with server domains ([e2aad4a](https://github.com/digitopvn/diginext/commit/e2aad4a176f1db0ff5c21c2af1a2d4fc78801558))
* **request deploy:** correct the app and project slug when calling request deploy api ([2b23577](https://github.com/digitopvn/diginext/commit/2b235774e3c5ab876f5e3113a89f490f1d79c422))
* **request deploy:** issue when deploy old app ([9213a05](https://github.com/digitopvn/diginext/commit/9213a05e9480be363485385c1a0f2affbe3112a1))
* **server cluster:** authenticate cluster before create or update ([a2ad4d5](https://github.com/digitopvn/diginext/commit/a2ad4d512f21e6a1e816da1b0110518d5921ba79))
* **start build:** issue of git pull rebase ([79b8620](https://github.com/digitopvn/diginext/commit/79b86201e1281155ca1cb7e1a295edf385793ea9))
* **stop build:** issue when stop build ([d9e58c8](https://github.com/digitopvn/diginext/commit/d9e58c802fd12f3e7126317ea318ddf37617d6ff))


### Features

* **deploy environment compare:** compare deploy config ([69636a4](https://github.com/digitopvn/diginext/commit/69636a40da8ea8873b785c4f3981094ab86a24fe))

## [2.3.4](https://github.com/digitopvn/diginext/compare/v2.3.3...v2.3.4) (2023-03-03)


### Bug Fixes

* **app migration:** disable migrating app deploy environment ([3127166](https://github.com/digitopvn/diginext/commit/3127166331f3629afef8e7eaea02bf1b090818c4))
* **deploy:** kubernetes only accept string as env variable value ([6054c46](https://github.com/digitopvn/diginext/commit/6054c465b9c1a64214d9bbed8215dd1e266dfb6b))

## [2.3.3](https://github.com/digitopvn/diginext/compare/v2.3.2...v2.3.3) (2023-03-03)


### Bug Fixes

* **deploy:** ssl issue for longer than 64 chars domain ([eefd4d3](https://github.com/digitopvn/diginext/commit/eefd4d39df2ea8cbfafda114205aa07a51e0b220))

## [2.3.2](https://github.com/digitopvn/diginext/compare/v2.3.1...v2.3.2) (2023-03-03)


### Bug Fixes

* **cluster controller:** authenticate cluster before create new or update ([e5253b4](https://github.com/digitopvn/diginext/commit/e5253b4a4e9ea241eeefe9ae59ff8eea94f478bc))
* **deploy:** issue of ask for deploy environment info ([6cad2f1](https://github.com/digitopvn/diginext/commit/6cad2f1ae6a5d098cbe6218de0200b5913044d84))
* **digital ocean:** issue auth k8s cluster command typo ([7d59a78](https://github.com/digitopvn/diginext/commit/7d59a78450ac4d0ca0e0da64a843a579a6e98afa))

## [2.3.1](https://github.com/digitopvn/diginext/compare/v2.3.0...v2.3.1) (2023-03-02)


### Bug Fixes

* **cli app and deploy:** form issues of deploy or new app or init app command ([f028519](https://github.com/digitopvn/diginext/commit/f0285194de425744a75f645617c948e3ea3ccab8))
* **cli deploy:** can select or create new app when deploy a deleted app ([87a4d58](https://github.com/digitopvn/diginext/commit/87a4d58bb561408062bc8751761179f51beb627c))
* **donate buttons:** add donate buttons to buy some beers ([ee30d16](https://github.com/digitopvn/diginext/commit/ee30d162f29098c85c962cd882f437e98d2267e2))

# [2.3.0](https://github.com/digitopvn/diginext/compare/v2.2.0...v2.3.0) (2023-03-01)


### Bug Fixes

* **base service:** generated slug now becomes shorter but still unique ([3f89675](https://github.com/digitopvn/diginext/commit/3f896757f6ac41d0b308c69894786bf125f3f2eb))
* **cli and server:** remove jq package ([6270266](https://github.com/digitopvn/diginext/commit/62702669b2bc7bb10044b44d01cd89ea26d8a8a5))
* **deploy app:** fix issue of deploy app or project which was deleted ([872fc85](https://github.com/digitopvn/diginext/commit/872fc8558124f4b5b03eb589d203301b8efc43d1))
* **env vars api:** add crud api of app environment variables ([c3bd49a](https://github.com/digitopvn/diginext/commit/c3bd49adf44b4340648fbd7d1c6fe65562c0d523))
* **start-build:** issue of project name is undefined ([98fbb69](https://github.com/digitopvn/diginext/commit/98fbb6956994287ae2b71675d81e67436b60770a))


### Features

* **cli dotenv:** ability to upload and download dotenv from to deploy environment ([b3934d7](https://github.com/digitopvn/diginext/commit/b3934d7691d27d313ef0509477807c6acbdd03f6))

# [2.2.0](https://github.com/digitopvn/diginext/compare/v2.1.0...v2.2.0) (2023-02-28)


### Bug Fixes

* **cli git:** ability to check for repository access rights ([aa38e93](https://github.com/digitopvn/diginext/commit/aa38e9360baeea6b99fd8ccff90e5741619179d3))
* **user,workspace controller:** issue of multiple imports in user and workspace services ([2ad9a1e](https://github.com/digitopvn/diginext/commit/2ad9a1ed6b3268b6b3138e72152ef03173fd8652))


### Features

* **add app api to create deploy environment and get client app config:** apps api ([4e676ca](https://github.com/digitopvn/diginext/commit/4e676ca1ab8f7aa54569757ad2c5c2081c9fa2bf))

# [2.1.0](https://github.com/digitopvn/diginext/compare/v2.0.7...v2.1.0) (2023-02-27)


### Bug Fixes

* **deploy:** update project so it can be sorted on top of the list ([9f5c340](https://github.com/digitopvn/diginext/commit/9f5c340f45675afcf302fbe3347b9d727e4b5a15))


### Features

* **deploy with image url:** add api to deploy with image url, apps and releases migration ([3db4de4](https://github.com/digitopvn/diginext/commit/3db4de4333e230c515cea300cf0ec988a07657bf))

## [2.0.7](https://github.com/digitopvn/diginext/compare/v2.0.6...v2.0.7) (2023-02-24)


### Bug Fixes

* **upload dotenv:** fix issue of uploading dotenv when deploy ([232df3c](https://github.com/digitopvn/diginext/commit/232df3cd3ff7bcccde55548ce0b5266fb50ebe7f))

## [2.0.6](https://github.com/digitopvn/diginext/compare/v2.0.5...v2.0.6) (2023-02-24)


### Bug Fixes

* **deploy new app:** fix issue of deploy prod when init new app due to undefined environment ([e7fc258](https://github.com/digitopvn/diginext/commit/e7fc2585581fc486033c3ff9a81a82984a9d32f3))

## [2.0.5](https://github.com/digitopvn/diginext/compare/v2.0.4...v2.0.5) (2023-02-24)


### Bug Fixes

* **cli build:** fix docker buildx driver did not initialized before build ([49adb22](https://github.com/digitopvn/diginext/commit/49adb2217c4ee9ff9279ae36240624c4f4f52edc))
* **cli:** check for new version when execute cli command ([35a2942](https://github.com/digitopvn/diginext/commit/35a2942d9346682dd213df36753cd77d0fd8fcef))

## [2.0.4](https://github.com/digitopvn/diginext/compare/v2.0.3...v2.0.4) (2023-02-24)


### Bug Fixes

* **admin ui:** fix redirect url sometime return incorrect value ([987761e](https://github.com/digitopvn/diginext/commit/987761ea531e7801770cf490ca6a06a33b56c075))
* **base service:** disable debug log in base service ([498c475](https://github.com/digitopvn/diginext/commit/498c475eb6b9351e49cff138a18e3201ef1690d0))
* **dockerfile:** add templates folder to docker build image ([b89f4fd](https://github.com/digitopvn/diginext/commit/b89f4fde52aaeaeef23c49bdb417e39d164a1f0b))

## [2.0.3](https://github.com/digitopvn/diginext/compare/v2.0.2...v2.0.3) (2023-02-23)


### Bug Fixes

* **hotfix:** fix issue of check version compatibility when deploy app ([99d4843](https://github.com/digitopvn/diginext/commit/99d484305b495d6873733e0e9bcc051a3f7ea023))
* **serveride generate deployment:** fix issue of api calling when generate deployment yaml on server ([3a5ad9c](https://github.com/digitopvn/diginext/commit/3a5ad9c2d39c7ec8517731d17151c228ba196750))

## [2.0.2](https://github.com/digitopvn/diginext/compare/v2.0.1...v2.0.2) (2023-02-22)


### Bug Fixes

* **admin ui:** fix issue of build log always display building message ([5472665](https://github.com/digitopvn/diginext/commit/54726650f57ad5a234be71c6c1e9c809d7790981))
* **admin ui:** fix websocket connection issue when viewing build logs ([141eef5](https://github.com/digitopvn/diginext/commit/141eef58ad0db5d2da9542df370093334f244ca5))
* **cli:** print better error messages when deploying app ([dfed07a](https://github.com/digitopvn/diginext/commit/dfed07a74a5d205d9dac8583aa7671de6ff2ef42))

## [2.0.1](https://github.com/digitopvn/diginext/compare/v2.0.0...v2.0.1) (2023-02-22)


### Bug Fixes

* **deploy:** check cli and server compability when deploying app ([41f4907](https://github.com/digitopvn/diginext/commit/41f4907ff8b1b87d46279c0a3b111761c3d3bf3b))

# [2.0.0](https://github.com/digitopvn/diginext/compare/v1.4.0...v2.0.0) (2023-02-22)


### Code Refactoring

* **deploy app do not generate yaml files anymore:** build, deploy, run ([dbe89a5](https://github.com/digitopvn/diginext/commit/dbe89a5439453f81cd4ca6d4fbf66d48ecd91979))


### BREAKING CHANGES

* **deploy app do not generate yaml files anymore:** cli command build, deploy, run

# [1.4.0](https://github.com/digitopvn/diginext/compare/v1.3.1...v1.4.0) (2023-02-21)


### Bug Fixes

* **dependencies:** update dependency versions ([74dc266](https://github.com/digitopvn/diginext/commit/74dc266b3b13221ba98fc96d21345253be53586a))
* **routes:** fix duplicate response data in all routes ([1a9c673](https://github.com/digitopvn/diginext/commit/1a9c6734b2ddc419e6b082372648f9f95b6a8897))
* **swagger:** add auth header security to all api routes ([8c3ad37](https://github.com/digitopvn/diginext/commit/8c3ad377b862b85098545738b1b7f7d014690bd2))


### Features

* **swagger api:** add swagger api for external integrations ([4789473](https://github.com/digitopvn/diginext/commit/47894738d0bb670fbf59bdb5c9966a568b165cd5))

## [1.3.1](https://github.com/digitopvn/diginext/compare/v1.3.0...v1.3.1) (2023-02-17)


### Bug Fixes

* **admin ui:** fix build sort and be able stop build ([c8b2888](https://github.com/digitopvn/diginext/commit/c8b28886ee42c7a959a26ffa9bf10d8fe714ae23))
* **build:** can be able to stop build and sort by updated at ([7e989ae](https://github.com/digitopvn/diginext/commit/7e989ae6d26a7e5f3f7c359e58446afa443fcf37))
* **generate deployment:** fix generate prerelease domain ([c3d1910](https://github.com/digitopvn/diginext/commit/c3d19107541addc35ade89399d211483d9077c5a))

# [1.3.0](https://github.com/digitopvn/diginext/compare/v1.2.2...v1.3.0) (2023-02-16)


### Bug Fixes

* **admin:** add framework crud and fix some bugs ([dc40b46](https://github.com/digitopvn/diginext/commit/dc40b46c704fe5e161335c9d6e67919d01f7f84a))
* **typeorm:** error when populate unexpected fields ([71c1bd5](https://github.com/digitopvn/diginext/commit/71c1bd52501db7c8358d9a503ef20b73fc4d7acf))


### Features

* **admin ui:** add crud to framework, cluster, git, cloud registry ([72b65ca](https://github.com/digitopvn/diginext/commit/72b65ca66b142758dac0d5e7720274a30294ef94))

## [1.2.2](https://github.com/digitopvn/diginext/compare/v1.2.1...v1.2.2) (2023-02-15)


### Bug Fixes

* **admin:** cluster crud ([87981ae](https://github.com/digitopvn/diginext/commit/87981ae1eeac636543442ef02062c48c17e7d579))
* **base service:** assign item authority when create new item ([092eb1b](https://github.com/digitopvn/diginext/commit/092eb1b4a463f496900359a7a327c081fcd60818))
* **bitbucket:** do not remove dockerfile when pulling framework ([264c353](https://github.com/digitopvn/diginext/commit/264c3533897326c452438afc44aa20e6815191d6))
* **deploy:** check for Dockerfile before request deploying ([32ab91d](https://github.com/digitopvn/diginext/commit/32ab91d666d825fc99d7d59a49f06214282e5a80))
* **dockerfile:** use node 16.x to avoid ts build path alias error ([1c5524c](https://github.com/digitopvn/diginext/commit/1c5524c99a7c2259bc30f087d95d4446078b3825))
* **typeorm:** fix typeorm build error by install xml2js app-root-path sha.js ([17be31a](https://github.com/digitopvn/diginext/commit/17be31ae3d44c72f8d550968b23a3faf3a3c0d3a))

## [1.2.1](https://github.com/digitopvn/diginext/compare/v1.2.0...v1.2.1) (2023-02-15)


### Bug Fixes

* **jwt and logs:** parse access token in url and print more logs to debug on server ([6cf251f](https://github.com/digitopvn/diginext/commit/6cf251f9354c51d532ff5a22b64a357c50c9f7ee))
* **package.json:** remove mrgoonie typeorm ([2356c30](https://github.com/digitopvn/diginext/commit/2356c30716774e2770f40457317081b286f4a1f4))

# [1.2.0](https://github.com/digitopvn/diginext/compare/v1.1.5...v1.2.0) (2023-02-14)


### Bug Fixes

* **api project:** delete related apps and environment when delete a project ([9bade2b](https://github.com/digitopvn/diginext/commit/9bade2b2fa46a2f519d2bc500a03a0b09e75f746))
* **build:** shorten build slug ([ddbbe7d](https://github.com/digitopvn/diginext/commit/ddbbe7db922572c966b01738b934f36eb8666b6b))
* **deploy:** ingress tls secret will be generated by domain ([70e658d](https://github.com/digitopvn/diginext/commit/70e658d6c1c88ec6fbe2d5dceb4a33c52331dd9e))
* **roll out:** always create new ingress when rolling out deployment ([a8987e8](https://github.com/digitopvn/diginext/commit/a8987e871e742f1481cc3811934bc26d8d116c96))
* **system:** add cronjob to clean up system cache and free up spacing ([e110ec7](https://github.com/digitopvn/diginext/commit/e110ec713d9b3950be81ea2d4683ed42fae5b968))


### Features

* **admin:** delete project, app, environment ([f026e50](https://github.com/digitopvn/diginext/commit/f026e508b2fae1874f8163a04343f3071a562651))
* **cli update:** update cli with dx update command ([254654e](https://github.com/digitopvn/diginext/commit/254654ee442fd75e254c1f9d078707f5115de9c7))

## [1.1.5](https://github.com/digitopvn/diginext/compare/v1.1.4...v1.1.5) (2023-02-13)


### Bug Fixes

* **base controller:** mongodb convert id to _id ([dfa4c98](https://github.com/digitopvn/diginext/commit/dfa4c9883fe089e36dbbe2077b3cc1bc66e88368))
* **build status:** fixed update latest build to project and app ([2e7de51](https://github.com/digitopvn/diginext/commit/2e7de51316c05995a00c69a0092f847afbb4dcb1))
* **cli:** update di command to dx command ([283fc86](https://github.com/digitopvn/diginext/commit/283fc86dcdb73dab4d472009f98532d5df1724b3))
* **deploy:** fix build log url when request deploy ([53ceaf2](https://github.com/digitopvn/diginext/commit/53ceaf2e6aad556dda0aed7603a187d56f40a402))
* **deploy:** fix generate ssl error when domain is longer than 64 characters ([bd1ea58](https://github.com/digitopvn/diginext/commit/bd1ea58b0cd62697fecea61022ec6e2e0cd874f6))
* **deploy:** fixed deploy issue on new app ([072b073](https://github.com/digitopvn/diginext/commit/072b0733cd2cf45b7dbd46336f5b7700d329b63f))
* **init app:** fixed issue of get git remote url when initializing app ([85c929a](https://github.com/digitopvn/diginext/commit/85c929a6c67f4010cbbe9d6987c85c8fee6647c5))
* **logs:** add logs to base service ([850df37](https://github.com/digitopvn/diginext/commit/850df37675af8091611503fdf650da2255ba46ef))
* **typeorm:** fix typeorm query with skip and take to do pagination ([7efadb5](https://github.com/digitopvn/diginext/commit/7efadb5c7f5f118301da19a0fb584a5c48a6c8df))

## [1.1.4](https://github.com/digitopvn/diginext/compare/v1.1.3...v1.1.4) (2023-02-03)


### Bug Fixes

* **admin:** fixed login redirect ([f94bd67](https://github.com/digitopvn/diginext/commit/f94bd67ed1c5455a01c765521905c3d852c5c9dc))
* **base controller:** fix object id type ([bb5f407](https://github.com/digitopvn/diginext/commit/bb5f4077336e1377506adc78c3469fb5cc003592))
* **dashboard:** fixed empty content of log detail ([c28a8d6](https://github.com/digitopvn/diginext/commit/c28a8d617fd486522f7195f128e5fec5bea5ecf0))
* **logs:** correct directory path of logs ([c3a8446](https://github.com/digitopvn/diginext/commit/c3a84464785834230e0ab7baaaa11cd61c1adfe4))
* **logs:** correct log file path ([7b78729](https://github.com/digitopvn/diginext/commit/7b78729d86eb013f4f0d15812ae1c80ef0839c0c))
* **logs:** fix correct logs directory ([3f1a2d3](https://github.com/digitopvn/diginext/commit/3f1a2d3b5b8f5a764c5d2a71d63c993766740fef))

## [1.1.3](https://github.com/digitopvn/diginext/compare/v1.1.2...v1.1.3) (2023-02-01)


### Bug Fixes

* **cli login:** select active workspace when login with cli ([66246c3](https://github.com/digitopvn/diginext/commit/66246c34b5365bdc9a00502b653017295d9a5c46))

## [1.1.2](https://github.com/digitopvn/diginext/compare/v1.1.1...v1.1.2) (2023-01-31)


### Bug Fixes

* **cli login:** fix first time workspace login issue ([7da48a8](https://github.com/digitopvn/diginext/commit/7da48a8c921f37a3a6ff1134f1039554732cb8e4))
* **workspace join:** fix issue of joining new workspace ([ba0bfb2](https://github.com/digitopvn/diginext/commit/ba0bfb224ebd283f7f446636984af6661e381a38))

## [1.1.1](https://github.com/digitopvn/diginext/compare/v1.1.0...v1.1.1) (2023-01-16)


### Bug Fixes

* **build:** fix stop build, not sure why it still not working ([d9dc90f](https://github.com/digitopvn/diginext/commit/d9dc90ff387ddec4d09c24e1e39560710bbc3097))
* **deploy:** fix incorrect mapping port when generate deployment files ([dc205eb](https://github.com/digitopvn/diginext/commit/dc205eb996b29fbadb5ea8f4502cfecae883e69b))
* **deploy:** improve roll out on dev environment ([33b8988](https://github.com/digitopvn/diginext/commit/33b898858e0a3d57e29f1dac50d43ce3a750d344))

# [1.1.0](https://github.com/digitopvn/diginext/compare/v1.0.4...v1.1.0) (2023-01-15)


### Features

* **admin:** add front-end admin ui ([5bbc4fc](https://github.com/digitopvn/diginext/commit/5bbc4fc20b0da5fd567fa0a42096af80fa0354d7))

## [1.0.4](https://github.com/digitopvn/diginext/compare/v1.0.3...v1.0.4) (2023-01-15)


### Bug Fixes

* **app init:** bugs of incorrect git data when init app ([7e27b86](https://github.com/digitopvn/diginext/commit/7e27b86c7d3942e7acafa5c956246033eb042d12))
* **logs:** turn off some logs ([9585b8f](https://github.com/digitopvn/diginext/commit/9585b8f03a22a8a6779a58521e0ac101511f2be7))

## [1.0.3](https://github.com/digitopvn/diginext/compare/v1.0.2...v1.0.3) (2023-01-15)


### Bug Fixes

* **init app:** bugs in update env when initialize app ([eaace6f](https://github.com/digitopvn/diginext/commit/eaace6f19f0b41c0e0966eec1f405380257d5910))

## [1.0.3](https://github.com/digitopvn/diginext/compare/v1.0.2...v1.0.3) (2023-01-15)


### Bug Fixes

* **init app:** bugs in update env when initialize app ([eaace6f](https://github.com/digitopvn/diginext/commit/eaace6f19f0b41c0e0966eec1f405380257d5910))

## [1.0.2](https://github.com/digitopvn/diginext/compare/v1.0.1...v1.0.2) (2023-01-15)


### Bug Fixes

* **cli:** bugs of create new app ([973cbd1](https://github.com/digitopvn/diginext/commit/973cbd10fd02d39b7d795f2fc6c242a917f2a68f))
* **expose secrets:** expose secrets ([8d5d8ed](https://github.com/digitopvn/diginext/commit/8d5d8ed4016000efd92dc55455b48c5ef94043b2))

## [1.0.1](https://github.com/digitopvn/diginext/compare/v1.0.0...v1.0.1) (2023-01-14)


### Bug Fixes

* **remove unnecessary warnings:** remove unnecessary warnings ([363975d](https://github.com/digitopvn/diginext/commit/363975d643dd56205e0cea59d96ef10d391ac3c2))

# 1.0.0 (2023-01-14)


### Bug Fixes

* **active workspace:** correct the active workspace when doing cli login ([bfb69be](https://github.com/digitopvn/diginext/commit/bfb69be7f9c64f475036906296ba4db0fe5bdcfd))
* **hotfix jwt:** add default secret ([aae1f3d](https://github.com/digitopvn/diginext/commit/aae1f3d5b5e98d067a23969f4e82bcdf67feb46e))
* **stop build:** try to implement stop build process but failed ([75c6eed](https://github.com/digitopvn/diginext/commit/75c6eede71b8e78d0729d30fb3784000ea2893e9))
* **use dx as main command:** change from di to dx as primary command ([3071c87](https://github.com/digitopvn/diginext/commit/3071c873f792f074f89511f907efedac4a7b2380))


### Features

* **automation scripts:** install docker, node, yarn, gcloud, doctl, jq, kubectl, k3s ([f2497e8](https://github.com/digitopvn/diginext/commit/f2497e86dd9c3d02987f868353e5c4f6bce095d0))
* **workspace:** join a workspace, add user to workspace, auth user with a workspace ([189a028](https://github.com/digitopvn/diginext/commit/189a02853324c93118972036c47c01c07f622b08))

# 1.0.0 (2023-01-14)


### Bug Fixes

* **active workspace:** correct the active workspace when doing cli login ([bfb69be](https://github.com/digitopvn/diginext/commit/bfb69be7f9c64f475036906296ba4db0fe5bdcfd))
* **stop build:** try to implement stop build process but failed ([75c6eed](https://github.com/digitopvn/diginext/commit/75c6eede71b8e78d0729d30fb3784000ea2893e9))
* **use dx as main command:** change from di to dx as primary command ([3071c87](https://github.com/digitopvn/diginext/commit/3071c873f792f074f89511f907efedac4a7b2380))


### Features

* **automation scripts:** install docker, node, yarn, gcloud, doctl, jq, kubectl, k3s ([f2497e8](https://github.com/digitopvn/diginext/commit/f2497e86dd9c3d02987f868353e5c4f6bce095d0))
* **workspace:** join a workspace, add user to workspace, auth user with a workspace ([189a028](https://github.com/digitopvn/diginext/commit/189a02853324c93118972036c47c01c07f622b08))

# 1.0.0 (2023-01-14)


### Bug Fixes

* **active workspace:** correct the active workspace when doing cli login ([bfb69be](https://github.com/digitopvn/diginext/commit/bfb69be7f9c64f475036906296ba4db0fe5bdcfd))
* **stop build:** try to implement stop build process but failed ([75c6eed](https://github.com/digitopvn/diginext/commit/75c6eede71b8e78d0729d30fb3784000ea2893e9))
* **use dx as main command:** change from di to dx as primary command ([3071c87](https://github.com/digitopvn/diginext/commit/3071c873f792f074f89511f907efedac4a7b2380))


### Features

* **automation scripts:** install docker, node, yarn, gcloud, doctl, jq, kubectl, k3s ([f2497e8](https://github.com/digitopvn/diginext/commit/f2497e86dd9c3d02987f868353e5c4f6bce095d0))
* **workspace:** join a workspace, add user to workspace, auth user with a workspace ([189a028](https://github.com/digitopvn/diginext/commit/189a02853324c93118972036c47c01c07f622b08))

# 1.0.0 (2023-01-10)


### Bug Fixes

* **add exports:** export modules into index ([959820e](https://bitbucket.org/digitopvn/di/commits/959820e6658a6e06cfa44167af3feeed0870656b))
* **app domain:** update domain when deploying ([45abdc8](https://bitbucket.org/digitopvn/di/commits/45abdc8400f0588f0b2dc81323b8562288fa4777))
* **authentication:** fix access token and populate workspace in user api ([2154dd3](https://bitbucket.org/digitopvn/di/commits/2154dd378888de26bf7fa3b915e09297ea84fb0f))
* **bugs:** client vs server, fetch api, modules, startup scripts ([1ea6805](https://bitbucket.org/digitopvn/di/commits/1ea6805fd5d0cba1510d030d7df125c05ce39805))
* **build and logger:** fix build and logger issues ([5f4b4f0](https://bitbucket.org/digitopvn/di/commits/5f4b4f0b338d2c4c2a17dd02242414a48d6dc7c5))
* **cluster auth bug:** fix cluster and provider authentication bugs ([cbd86fb](https://bitbucket.org/digitopvn/di/commits/cbd86fb37f510528b80b9bebf5b266e6c706d952))
* **command deploy and run:** fix image pull secret not working when deploying ([4b327fe](https://bitbucket.org/digitopvn/di/commits/4b327fe045ec5e02d40c9137ea3d2026e534e72e))
* **connect container registry:** use different methods of client and server mode ([8df34c5](https://bitbucket.org/digitopvn/di/commits/8df34c540cae9a796ce8647ad676e45043e5e0a3))
* **connect custom cluster bug:** fix error when connect to cluster (incorrect kubeconfig content) ([24f4571](https://bitbucket.org/digitopvn/di/commits/24f45714490855cdb386e46b3d48e615cbfc4e02))
* **create duplicated registries:** fix bugs of creating duplicated container registries in database ([8d89d06](https://bitbucket.org/digitopvn/di/commits/8d89d060a8c65d9345df5feef219d54daff6e7b5))
* **deploy and build:** correct the registry and image pull secret ([1a65c6c](https://bitbucket.org/digitopvn/di/commits/1a65c6c5618cf6e88d7f55c9f0b2ffd8e942c9a1))
* **dev goon branch:** create dev goon branch ([3ddca49](https://bitbucket.org/digitopvn/di/commits/3ddca499ba4b067a1f3d575d4d586311d5e6e3c0))
* **domains:** domain can be optional ([741a86f](https://bitbucket.org/digitopvn/di/commits/741a86f188311e82707cb5b4bf9e0b2c4b7d3cf4))
* **git pull request username:** fixed git pull request username disapear ([9a22cda](https://bitbucket.org/digitopvn/di/commits/9a22cda91ef7d83d2fa4020034e6b8124ed34a24))
* **git pull request:** fix create pull request on bitbucket ([0f731c7](https://bitbucket.org/digitopvn/di/commits/0f731c7e17d83a3b78589aa11885d9820eba9e1e))
* **image pull secret:** fix connect to container registry and create image pull secret ([58b7acc](https://bitbucket.org/digitopvn/di/commits/58b7acc030ddd86b397acf9321980eade263edf5))
* **log to string:** git pr log to string ([5966581](https://bitbucket.org/digitopvn/di/commits/59665812c658ff8f328d6aecd0d9c3f760ff2cd2))
* **lot of bugs and apis:** rollout, release, preview, build, run, fetch deployment ([140b983](https://bitbucket.org/digitopvn/di/commits/140b983ce814c119ebbc02e8bcbe11fbe8ab99e9))
* **pr log:** log instead of error ([f45560d](https://bitbucket.org/digitopvn/di/commits/f45560d0c6cea2ec8a0744b95853cea9902e704f))
* **readme gitignore:** clear gitignore cache ([35e2fec](https://bitbucket.org/digitopvn/di/commits/35e2fec2358ffec2bdf7ccd19ca113ccec84821c))
* **registry secret:** fix incorrect registry secret generated ([570b715](https://bitbucket.org/digitopvn/di/commits/570b715930046efe5bae21cef4f61618588272aa))
* **rollout:** improve rollout command ([193e7aa](https://bitbucket.org/digitopvn/di/commits/193e7aaf64249b1d6c241d083cc65153c3a27d19))
* **semantic release:** install dev deps ([364315f](https://bitbucket.org/digitopvn/di/commits/364315fd230250c035e5b132c090bd51960228b0))
* **username:** username is equal to user slug ([6d7342c](https://bitbucket.org/digitopvn/di/commits/6d7342cf3384afa819a8f102ee279332573a4271))


### Features

* **app:** init app ([6ec901d](https://bitbucket.org/digitopvn/di/commits/6ec901db429d0c3fc8c2b428460044df39ff99ab))
* **build, release and roll out:** make build, release and roll out work properly ([7110659](https://bitbucket.org/digitopvn/di/commits/7110659456aaeeff1d8dabb95730b46c53b69403))
* **domain:** create domain command ([725faf6](https://bitbucket.org/digitopvn/di/commits/725faf62f8bed5f889dd5c4f9feb81a01b0d8a11))
* **first commit:** v1 beta version ([a01dfd7](https://bitbucket.org/digitopvn/di/commits/a01dfd70600f55bb88dd91b5967b819b5c7a1ae9))
* **readme:** add image ([cb11a02](https://bitbucket.org/digitopvn/di/commits/cb11a0221bd88429dfbc05139bfe73cfe8ed4988))
* **resolve todos:** git, k8s, account, framework, providers, fetch api ([828ac99](https://bitbucket.org/digitopvn/di/commits/828ac998d7c7ef3ad5124c1007e61e81bee999c8))
* **sort and order:** add sort feature to base service and base controller ([b760d8b](https://bitbucket.org/digitopvn/di/commits/b760d8bf99a47eaa3bc45c3a04dd653c8f782652))

# 1.0.0 (2023-01-01)


### Bug Fixes

* **authentication:** fix access token and populate workspace in user api ([2154dd3](https://bitbucket.org/digitopvn/di/commits/2154dd378888de26bf7fa3b915e09297ea84fb0f))
* **command deploy and run:** fix image pull secret not working when deploying ([4b327fe](https://bitbucket.org/digitopvn/di/commits/4b327fe045ec5e02d40c9137ea3d2026e534e72e))
* **deploy and build:** correct the registry and image pull secret ([1a65c6c](https://bitbucket.org/digitopvn/di/commits/1a65c6c5618cf6e88d7f55c9f0b2ffd8e942c9a1))
* **dev goon branch:** create dev goon branch ([3ddca49](https://bitbucket.org/digitopvn/di/commits/3ddca499ba4b067a1f3d575d4d586311d5e6e3c0))
* **domains:** domain can be optional ([741a86f](https://bitbucket.org/digitopvn/di/commits/741a86f188311e82707cb5b4bf9e0b2c4b7d3cf4))
* **git pull request username:** fixed git pull request username disapear ([9a22cda](https://bitbucket.org/digitopvn/di/commits/9a22cda91ef7d83d2fa4020034e6b8124ed34a24))
* **git pull request:** fix create pull request on bitbucket ([0f731c7](https://bitbucket.org/digitopvn/di/commits/0f731c7e17d83a3b78589aa11885d9820eba9e1e))
* **image pull secret:** fix connect to container registry and create image pull secret ([58b7acc](https://bitbucket.org/digitopvn/di/commits/58b7acc030ddd86b397acf9321980eade263edf5))
* **log to string:** git pr log to string ([5966581](https://bitbucket.org/digitopvn/di/commits/59665812c658ff8f328d6aecd0d9c3f760ff2cd2))
* **pr log:** log instead of error ([f45560d](https://bitbucket.org/digitopvn/di/commits/f45560d0c6cea2ec8a0744b95853cea9902e704f))
* **readme gitignore:** clear gitignore cache ([35e2fec](https://bitbucket.org/digitopvn/di/commits/35e2fec2358ffec2bdf7ccd19ca113ccec84821c))
* **registry secret:** fix incorrect registry secret generated ([570b715](https://bitbucket.org/digitopvn/di/commits/570b715930046efe5bae21cef4f61618588272aa))
* **rollout:** improve rollout command ([193e7aa](https://bitbucket.org/digitopvn/di/commits/193e7aaf64249b1d6c241d083cc65153c3a27d19))
* **semantic release:** install dev deps ([364315f](https://bitbucket.org/digitopvn/di/commits/364315fd230250c035e5b132c090bd51960228b0))
* **username:** username is equal to user slug ([6d7342c](https://bitbucket.org/digitopvn/di/commits/6d7342cf3384afa819a8f102ee279332573a4271))


### Features

* **app:** init app ([6ec901d](https://bitbucket.org/digitopvn/di/commits/6ec901db429d0c3fc8c2b428460044df39ff99ab))
* **build, release and roll out:** make build, release and roll out work properly ([7110659](https://bitbucket.org/digitopvn/di/commits/7110659456aaeeff1d8dabb95730b46c53b69403))
* **domain:** create domain command ([725faf6](https://bitbucket.org/digitopvn/di/commits/725faf62f8bed5f889dd5c4f9feb81a01b0d8a11))
* **first commit:** v1 beta version ([a01dfd7](https://bitbucket.org/digitopvn/di/commits/a01dfd70600f55bb88dd91b5967b819b5c7a1ae9))
* **readme:** add image ([cb11a02](https://bitbucket.org/digitopvn/di/commits/cb11a0221bd88429dfbc05139bfe73cfe8ed4988))
* **resolve todos:** git, k8s, account, framework, providers, fetch api ([828ac99](https://bitbucket.org/digitopvn/di/commits/828ac998d7c7ef3ad5124c1007e61e81bee999c8))
* **sort and order:** add sort feature to base service and base controller ([b760d8b](https://bitbucket.org/digitopvn/di/commits/b760d8bf99a47eaa3bc45c3a04dd653c8f782652))
