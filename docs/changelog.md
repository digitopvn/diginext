# CHANGELOG

---

## Version 1.3.3

### Release date: 2022-11-15

-   [NEW] CDN > Upload Next.js static files!

---

## Version 1.3.2

### Release date: 2022-11-12

-   Build dự án trên máy của bạn & push image lên Container Registry:

    ```bash
    # cần authenticate provider & connect to registry trước (xem ở trên)
    # build môi trường DEV
    di build
    # build môi trường PROD
    di build --prod
    ```

---

## Version 1.3.1

### Release date: 2022-11-12

-   **[BREAKING] New way to deploy - less downtime!**
-   **[NEW] `di` is now an alias of `diginext`**
-   [NEW] GCLOUD & Digital Ocean Authentication: `di gcloud auth` & `di do auth`
-   [NEW] Connect Docker to GCLOUD & Digital Ocean Container Registry:
    -   `di gcloud registry connect -f /path/to/service-account.json`
    -   `di do registry connect --key <API_ACCESS_TOKEN>`

---

## Version 1.2.11

### Release date: 2022-11-08

-   [NEW] Deploy to any GKE clusters: `diginext deploy --provider=gcloud --cluster=<CLUSTER_NAME> --project=<GOOGLE_PROJECT_ID>`
-   [NEW] Deploy to any Digital Ocean clusters: `diginext deploy --provider=digitalocean --cluster=<CLUSTER_NAME>`
-   [NEW] Upload cdn to folder cache version:
    -   Auto load or create NEXT_PUBLIC_VERSION_CDN from `${project}/deployment/.env.${env}`
    -   Replace destination `public/` -> `public${NEXT_PUBLIC_VERSION_CDN}/`
    -   Start upload
-   [NEW] Upgrade to **Node 18.x**

---

## Version 1.2.10

### Release date: 2022-10-17

-   [FIX] Lỗi SSH authentication với Bitbucket dùng private key `id_rsa` -> `Keys are too open`.
-   [FIX] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 1.2.9

### Release date: 2022-10-16

-   [NEW] Thêm credentials cluster **"prubanca"** trên **Digital Ocean**.
-   [DOCS] Cập nhật README & CHANGELOG.

---

## Version 1.2.8

### Release date: 2022-10-08

-   [NEW] Thêm chiến lược roll out để hạn chế downtime khi deploy lên production.
-   [FIX] CLI > Sửa lại mapping container PORT bằng NODE_PORT trong file ENV.
-   [FIX] BUILD SERVER > Cập nhật project khi build status thay đổi.

---

## Version 1.2.7

### Release date: 2022-10-07

-   [NEW] Thêm `docker-compose.nginx.yaml` với Nginx, Certbot & Auto renew SSL.

---

## Version 1.2.6

### Release date: 2022-10-04

-   [FIX] Lỗi không thể tạo build mới trên Digirelease.

---

## Version 1.2.5

### Release date: 2022-10-04

-   [NEW] Lưu lịch sử các phiên bản build trên DIGIRELEASE.

---

## Version 1.2.4

### Release date: 2022-09-23

-   [FIX] Cập nhật phần quản lý database (MongoDB) trên DEV3: `diginext db new <db-name> --do`
-   [FIX] MONGGODB: Tạo database mới hoặc tạo default user cho một database nào đó thì sẽ dùng random password.
-   [FIX] Thêm cấu hình SSL secret trong `dx.json`:
    ```json
    {
        ...
        "tls-secret": {
            "dev": "some-custom-secret-tls"
        },
        ...
    }
    ```
-   [FIX] Mặc định sẽ thừa kế cấu hình deployment từ lần deploy trước đó (default: `--inherit=true`)

---

## Version 1.2.3

### Release date: 2022-08-15

-   [HOTFIX] Mở lại question nhập `namespace` khi tạo dự án.
-   [NEW] Deploy lên môi trường `dev` mặc định sẽ là `DEV3` (dev3.digitop.vn)
-   [FIX] Cập nhật documentation.

---

## Version 1.2.2

### Release date: 2022-08-12

-   [HOTFIX] Tạo secret để pull docker image từ `GCLOUD` về `dev3`.

---

## Version 1.2.1

### Release date: 2022-08-12

-   [HOTFIX] Deploy lên `dev3` với custom domain.

---

## Version 1.2.0

### Release date: 2022-08-11

-   [NEW] Thêm flag `--provider=(gcloud|do)` để deploy lên Digital Ocean (DO) và GCloud Platform (GCP), mặc định là `gcloud`.
-   [NEW] Thêm shortcut cho `--provider=digitalocean` là `--do` hoặc `--digitalocean`.
-   [NEW] Thêm shortcut cho `--provider=gcloud` là `--gcp` hoặc `--gcloud`.
-   [NEW] Thêm CLI development mode: `DEV_MODE=true diginext [command] ...`
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 1.1.1

### Release date: 2022-08-10

-   [FIXED] Sửa môi trường `canary` sẽ deploy lên [GCLOUD] `digitop-cluster`.
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 1.1.0

### Release date: 2022-08-05

-   **[BREAKING] Restructure / refactor toàn bộ project directories.**
-   [NEW] Tạo project với framework `monorepo-all`.
-   [NEW] Tạo project với framework `monorepo-next-and-nest`.
-   [NEW] Tạo project với framework `monorepo-next-and-docs`.
-   [NEW] Tạo project với framework `monorepo-next-and-socket`.
-   [NEW] Tạo project với framework `monorepo-digicms`.
-   [NEW] Deploy MONOREPO project bằng cách thêm flag `--app={APP_NAME}` (VD: `diginext deploy --app=diginext-examples`)
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 1.0.3

### Release date: 2022-07-10

-   [FIXED] Sửa lỗi tạo project với framework `none`.
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 1.0.2

### Release date: 2022-02-17

-   [FIXED] Chuyển GIT từ HTTPS sang SSH.
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 1.0.1

### Release date: 2022-01-13

-   [NEW] Thêm lệnh **`diginext auth`** để authenticate với **Google Container Registry**.
-   [NEW] Cập nhật container url trong `Dockerfile` template.
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 1.0.0

### Release date: 2022-01-13

-   [NEW] Vì CLI đã khá ổn định nên release **VERSION 1.0.0 (OFFICIAL)**.
-   [NEW] Khi deploy thì sort project mới được build lên trên cùng của **Digirelease**.
-   [FIXED] Sửa vài lỗi nhỏ khác.

---

## Version 0.9.11

### Release date: 2021-12-08

-   [BREAKING] Chính thức hỗ trợ **Windows OS**.
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.9.10

### Release date: 2021-10-20

-   [HOTFIX] Build URL bị dính `projectSlug`.
-   [NEW] Thêm các nhánh `tools` của framework vào lúc tạo project mới.
-   [NEW] Làm gọn lại lệnh analytics: `diginext analytics new` (tự lấy name và url trong `dx.json`)
-   [NEW] Update version `NodeJS` trong `Dockerfile` lên `14.17.3`.
-   [IMPROVED] Highlight lỗi khi deploy với flag `--debug`.
-   [FIXED] Khi cập nhật `diginext upgrade` thì loại trừ các tag `beta`.
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.9.9

### Release date: 2021-09-20

-   [IMPROVE] API to clean up server.
-   [IMPROVE] Auto clean up build server.
-   [HOTFIX] Fixed the build server was crashing sometime.

---

## Version 0.9.8

### Release date: 2021-09-16

-   [IMPROVE] Tăng build version trong `package.json` khi deploy.
-   [IMPROVE] Thêm các option resource của deploy: `4x`, `5x` và `6x`.
-   [IMPROVE] Nhắc nhở tạo Pull Request tới nhánh `master` khi deploy `prod`.
-   [FIXED] Sửa `projectSlug` bị rỗng khi deploy.

---

## Version 0.9.7

### Release date: 2021-09-13

-   **[BREAKING] Đổi domain của `prerelease` endpoint sang `*.topgroup.site`**
-   **[HOTFIX]** Lỗi SSL config cho **Prerelease** domain.
-   [FIXED] Sửa **`diginext cdn purge`**.
-   [IMPROVE] Thêm hướng dẫn deploy khi tạo dự án mới.

---

## Version 0.9.6

### Release date: 2021-09-08

-   **[BREAKING] Chuyển toàn bộ CLI sang ES6.**
-   **[HOTFIX]** Cải thiện **CLOUD BUILD** tránh tình trạng **nhầm lẫn cluster/môi trường khi deploy chạy cùng lúc**.

---

## Version 0.9.5

### Release date: 2021-09-05

-   [NEW] Thêm flag `--inherit` cho phép thừa kế lại các custom config trong deployment YAML.
-   [NEW] Thêm flag `--no-ssl` cho phép **không** cấu hình SSL đối với deployment (thường là API BACKEND chung domain với FRONTEND thì ko cần SSL vì FRONTEND đã cấu hình rồi).
-   [IMPROVE] Lưu thông tin cấu hình deploy trước đó vào `dx.json` để thừa kế cấu hình cho lần deploy kế tiếp.
-   [IMPROVE] Cải thiện `diginext update` và thông báo version mới.
-   [FIXED] Sửa lỗi deploy cho Diginest framework (API)

---

## Version 0.9.4

### Release date: 2021-08-20

-   **[BREAKING] Sử dụng CLOUD để build, không còn build bằng Docker ở máy client nữa:**
    -   Khi `diginext deploy` hoặc `diginext deploy --prod` để deploy thì CLI sẽ request CLOUD để pull source code về và bắt đầu build.
    -   Để check status của build dùng format này: **https://digirelease.digitop.vn/build/`<project-slug>`/`<build-number>`** (lúc gõ lệnh deploy có hiện thông báo link status)
    -   Nếu muốn check status ngay tại shell thì thêm flag `--debug`. Ví dụ: `diginext deploy --debug`
    -   Sau khi build hoàn tất, nếu đang build `PRODUCTION` thì vào [DIGIRELEASE](https://digirelease.digitop.vn) để review & roll out, còn nếu deploy lên dev thì CLOUD sẽ tự động roll out.
-   [NEW] Giải phóng bớt ổ cứng với lệnh `diginext free`.
-   [NEW] Cho phép chọn `tools` khi tạo project mới (nhánh `tools/abcxyz`).
-   [NEW] Deploy với tùy chỉnh `resources` khác nhau, hỗ trợ 3 loại container: `1x` (mặc định), `2x`, `3x`.
    Command: `diginext deploy --prod --size 2x`

---

## Version 0.9.3

### Release date: 2021-08-07

-   **[BREAKING] Sử dụng `diginext deploy --prod` để deploy lên server PRODUCTION -> vào [DIGIRELEASE](https://digirelease.digitop.vn) để review & approve.**
-   **[BREAKING] Hiện chỉ có 5 tài khoản sau được phép publish release:**
    -   duynguyen@wearetopgroup.com
    -   khuongdinh@wearetopgroup.com
    -   sachle@wearetopgroup.com
    -   thanhnguyen@wearetopgroup.com
    -   anhnguyen@wearetopgroup.com
-   [NEW] Cài đặt packages sau khi update CLI -> `diginext update`.
-   [NEW] Quản lý database -> `diginext db <command>`.
-   [NEW] Quản lý analytics tracking code -> `diginext analytics <command>`.
-   [NEW] Hiển thị trạng thái khi đang pull framework về.
-   [NEW] Cấu hình `NAMESPACE` cho từng môi trường trong `dx.json` bằng: `{ ... "namespace": { "dev": "ABC", "prod": "DEF" } ... }` (Nhánh nào ko cấu hình NAMESPACE thì CLI **sẽ tự generate theo project name**)
-   [IMPROVE] Cố định base image version của `diginext` framework trong `deployment/*.Dockerfile`.
-   [FIXED] Sửa lỗi push lên CDN.
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.9.2

### Release date: 2021-05-05

-   [NEW] Sửa lỗi deployment dev1.
-   [NEW] Tự động generate deployment khi tạo project mới.
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.9.1

### 2021-04-28

-   **[NEW] Sửa NAMESPACE format khi tạo `deployment.yaml`**
-   [OPTIMIZE] Giảm dung lượng Docker image của CLI xuống (2GB -> 1,4GB)
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.9.0

### 2021-04-22

#### BREAKING CHANGES:

-   **Cập nhật CLI để sử dụng chung NAMESPACE cho cả FRONT-END và BACK-END.**
-   **Bỏ "deployment/env.json" -> Sử dụng ".env" thay thế.**
-   **[NEW] Deploy process: `diginext deploy generate` -> chỉnh sửa `.env.dev` -> `diginext deploy generate` -> `diginext deploy`.**
-   Đổi cách tạo **static HTML project** thành: `diginext new` -> chọn `static` ở phần framework selection.
-   Bỏ "nodejs" framework -> thay bằng "expressjs" (với `BASE_PATH` trong `.env`)

#### OTHER UPDATES:

-   **[NEW] Thêm dự án sử dụng ExpressJS framework**
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.8.3

### 2021-04-04

-   **[NEW] Thêm dự án sử dụng NodeJS**
-   [NEW] Có thể tự động merge pull request (nếu bạn là admin): `diginext git pr [FROM] [TO] --merge --update`
-   [NEW] Có thể tạo pull request tới nhiều nhánh cùng lúc: `diginext git pr FROM_BRANCH TO_BRANCH_1,TO_BRANCH_2 --update`
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.8.2

### 2021-01-04

-   **[NEW] Thêm dự án sử dụng NodeJS framework :P**
-   [NEW] Thêm dự án static framework (blank html files)
-   [NEW] Có thể generate deployment với port khác của container: `diginext deploy generate --port 8080` hoặc `diginext deploy generate -p 8080`
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.8.1

### 2020-12-31

-   **[NEW] Refactoring & clean up! :P**
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.8.0

### 2020-12-31

-   **[NEW] Deploy bằng cách mới - DOCKER IN DOCKER - để đồng nhất môi trường deploy (Không cần cài đặt `gcloud` nữa)**
-   [IMPROVE] `diginext deploy generate` sẽ tạo `bitbucket-pipelines.yaml` mới.
-   [IMPROVE] Chép ENV VARS từ `env.json` vào `Dockerfile` - Không cần dùng `--build-arg` trong `bitbucket-pipelines.yaml` nữa.
-   [FIXED] Sửa lỗi khi tạo pull request từ 2 nhánh khác hiện tại (VD: `diginext git pr staging prod`).
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.7.2

### 2020-12-23

-   [NEW] Thêm `--redirect` để redirect toàn bộ domain phụ về domain chính trong `dx.json`.
-   [FIXED] Sửa lỗi `bitbucket-pipelines.yaml`.
-   [FIXED] Sửa lỗi `kubectl` trên windows.
-   [FIXED] Sửa lỗi `{{image_name}}` khi `diginext deploy generate --prod`.
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.7.1

### 2020-12-17

-   [FIXED] Sửa lỗi `kubectl` không lấy được gcloud credentials.
-   [FIXED] Sửa lỗi ingress patch path trên Windows.
-   [FIXED] Sửa lỗi đặt tên namespace, service, appname trong deployment yaml.
-   [FIXED] Sửa vài lỗi nhỏ khác (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.7.0

### 2020-12-16

-   [NEW] Deploy lên DEVELOPMENT server: `diginext deploy`
-   [NEW] Generate deployment cho STAGING hoặc PRODUCTION:
    ```
    diginext deploy generate [--prod]
    diginext deploy generate [OUTPUT_YAML_PATH] [--prod]
    ```
-   [NEW] Hỗ trợ deploy ứng dụng [Diginest API Framework](https://bitbucket.org/digitopvn/diginest)
-   [FIXED] Sửa vài lỗi nhỏ (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.6.3

### 2020-12-03

-   [HOTFIX] Cập nhật `Dockerfile` bỏ những thư mục không cần thiết.
-   [HOTFIX] Cập nhật template của `dockerignore` và `gitignore`.
-   [HOTFIX] Refactor phần pull framework tránh các tag không cần thiết.
-   [FIXED] Sửa vài lỗi nhỏ (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.6.2

### 2020-12-01

-   [HOTFIX] Cập nhật `Dockerfile` bỏ những thư mục không cần thiết.
-   [HOTFIX] Bổ sung resource quota GKE cho `deployment.yaml` và `deployment_dev.yaml`.
-   [FIXED] Sửa vài lỗi nhỏ (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.6.1

### 2020-11-30

-   [HOTFIX] Bổ sung `docker-compose.yaml` khi nâng cấp framework cho dự án.
-   [NEW] Tạo pull request từ `branch1` đến `branch2`: `diginext git pr branch1 branch2`.
-   [FIXED] Sửa vài lỗi nhỏ (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.6.0

### 2020-11-28

-   [NEW] Nâng cấp framework cho dự án: `diginext upgrade`

---

## Version 0.5.1

### 2020-11-25

-   [NEW] Tạo Pull Request: `diginext git pr [DESTINATION_BRANCH=master]`
-   [NEW] Cập nhật phương thức deploy GKE mới (build nhanh hơn)
-   [NEW] Bổ sung IRON_SESSION_SECRET trong deployment YAML
-   [FIXED] Cập nhật tính năng xoá cache Google CDN: `diginext cdn purge [--prod]`
-   [FIXED] Sửa vài lỗi nhỏ (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.5.0

### 2020-11-18

-   [NEW] Chuyển CDN qua Google Cloud.
-   [NEW] Upload thư mục bất kỳ lên CDN với `diginext cdn push {directory_path}`
-   [FIXED] Sửa vài lỗi nhỏ (và có thể tạo ra thêm vài lỗi mới).

---

## Version 0.4.4

### 2020-11-10

-   [NEW] Tạo file gitignore khi khởi tạo dự án.
-   [FIXED] Sửa lỗi cũ và thêm vài lỗi mới.

---

## Version 0.4.3

### 2020-11-09

-   [NEW] Thịnh sửa vài lỗi gì đó.
-   [NEW] Tâm add thêm lỗi gì đó.

---

## Version 0.4.2

### 2020-10-19

-   [NEW] Thêm health check trong lúc tạo dự án.
-   [FIXED] Sửa lỗi login Bitbucket.

---

## Version 0.4.2

### 2020-10-19

-   [NEW] Tạo dự án static HTML với lệnh `diginext new --static`.
-   Fixed some minor issues (bitbucket authentication).

---

## Version 0.4.1

### 2020-10-19

-   [NEW] Đăng nhập và đăng xuất tài khoản Bitbucket với `diginext git login` và `diginext git logout`.
-   [NEW] Xem danh sách các repositories có hoạt động gần đây bằng: `diginext git repo` hoặc `diginext git repos`.
-   Fixed some minor issues.

---

## Version 0.4.0

### 2020-10-15

-   [NEW] Added default branch permissions for the git repository.
-   [NEW] Enable Bitbucket Pipelines by default after creating new git repository.
-   [NEW] Command to enable/disable pipeline: `diginext pipeline enable` & `diginext pipeline disable`
-   Fixed some minor issues.

---

## Version 0.3.8

### 2020-10-11

-   Fixed GIT authentication on a new computer.

---

## Version 0.3.7

### 2020-10-11

-   [Hot fix] create .env.local

---

## Version 0.3.6

### 2020-10-11

-   Add .env.local as default.
-   Add docker args to pipelines.
-   Fixed pipeline with projext slug.

---

## Version 0.3.5

### 2020-09-21

-   Auto-generate localhost certificates (HTTPS).

---

## Version 0.3.4

### 2020-09-14

-   Improve log messages with date & time.
-   Minor bugs fixed.

---

## Version 0.3.3

### 2020-09-14

-   Updated documentation.
-   Added changelog.
-   Minor bugs fixed.
