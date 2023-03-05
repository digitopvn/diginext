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
