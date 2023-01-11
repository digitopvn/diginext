# Danh sách các lệnh trong CLI:

## Diginext Project Helper

-   Tạo dự án mới:

    ```bash
    dx new
    ```

-   **[!!! DANGER !!!]** Bắt buộc tạo dự án mới **(ghi đè lên thư mục & git repo hiện tại nếu có)**:

    ```bash
    dx new --overwrite

    # short term:
    dx new -o
    ```

-   Khởi tạo Diginext framework trong thư mục có sẵn hiện tại:

    ```bash
    cd /path/to/current/app
    dx init
    ```

-   **[!!! DANGER !!!]** Cập nhật Framework lên version mới (có thể lựa chọn cập nhật tất cả hoặc chọn từng folder):
    (\*) Việc cập nhật tự động rất dễ xảy ra tình trạng mất code / ghi đè code, tốt nhất là cập nhật bằng tay (manual).

    ```bash
    dx upgrade
    ```

-   Cập nhật **Diginext CLI** lên version mới:

    ```bash
    dx --update
    dx -U
    ```

    Hoặc có thể cập nhật manually: **(AN TOÀN HƠN)**

    ```bash
    cd /path/to/di-cli
    git checkout master
    git fetch --all
    git pull --rebase
    npm install && npm link
    ```

## Deployment Helper

-   Authenticate Google Cloud với Service Account:

    ```bash
    dx gcloud auth -f /path/to/service-account.json
    ```

-   Authenticate Digital Ocean với API access token:

    ```bash
    dx do auth --key=<DO_API_ACCESS_TOKEN>
    ```

-   Connect Docker với Google Container Registry:

    ```bash
    # [Authentication required] `dx gcloud auth -f /path/to/service-account.json`
    dx gcloud registry connect --host=<GOOGLE_CONTAINER_REGISTRY_URL>
    ```

-   Connect Docker với Digital Ocean Container Registry:

    ```bash
    # [Authentication required] `dx do auth --key=<DO_API_ACCESS_TOKEN>`
    dx do registry connect
    ```

-   Build dự án trên máy của bạn & push image lên Container Registry:

    ```bash
    # cần authenticate provider & connect to registry trước (xem ở trên)
    # build môi trường DEV
    dx build
    # build môi trường PROD
    dx build --prod
    ```

-   Generate file cấu hình deployment cho các môi trường:

    ```bash
    # Tạo ra file "deployment/.env.dev" và "deployment/deployment.dev.yaml"
    dx deploy generate [--inherit=false]
    # Flag "--inherit=false" để tắt việc thừa kế cấu hình deployment từ lần trước đó, chỉ dùng cấu hình deployment mặc định.

    # Các câu lệnh generate cho môi trường khác
    dx deploy generate [--prod] [--redirect] [--template] [--inherit=false]
    dx deploy generate --env=canary [--redirect] [--template] [--inherit=false]
    ```

-   Deploy web lên **môi trường DEV** tại **Digital Ocean** (`dev3.digitop.vn` / Digital Ocean / dev3-digitop-vn):

    ```bash
    dx deploy
    # tương đương với
    dx deploy --dev --provider=digitalocean --cluster=dev3-digitop-vn
    ```

-   Deploy to any GKE clusters:

    ```bash
    dx deploy --provider=gcloud --cluster=<CLUSTER_NAME> --project=<GOOGLE_PROJECT_ID>
    ```

-   Deploy to any Digital Ocean clusters:

    ```bash
    dx deploy --prod --provider=digitalocean --cluster=<CLUSTER_NAME>
    ```

-   Deploy web lên **môi trường PRODUCTION** (DEV5.DIGITOP.VN / Google Cloud / CLUSTER **"digitop-cluster"** / PROJECT_ID **"top-group-k8s"**):

    ```bash
    dx deploy --prod

    # tương đương với
    dx deploy --prod --provider=gcloud --cluster=digitop-cluster --project=top-group-k8s

    # nếu muốn chạy PRODUCTION trên DEV3.DIGITOP.VN (DO):
    dx deploy --prod --provider=digitalocean --cluster=dev3-digitop-vn

    # nếu muốn chạy PRODUCTION trên K8S cluster "my-client-cluster" tại Digital Ocean (DO):
    dx deploy --prod --provider=digitalocean --cluster=my-client-cluster

    # nếu muốn chạy PRODUCTION trên K8S cluster "my-client-cluster", project "my-client-project" tại Google Cloud:
    dx deploy --prod --provider=gcloud --cluster=my-client-cluster --project=my-client-project
    ```

    Sau đó truy cập vào [DIGIRELEASE](https://digirelease.digitop.vn) để xem bản preview (pre-release), và ROLL OUT để go live.

    -   Chỉ có 1 số tài khoản nhất định có thể roll out:

        -   duynguyen@wearetopgroup.com
        -   khuongdinh@wearetopgroup.com
        -   sachle@wearetopgroup.com
        -   anhnguyen@wearetopgroup.com
        -   thinhnguyen@wearetopgroup.com

-   Deploy web lên **môi trường bất kỳ**:

    ```bash
    # Sử dụng cấu hình "deployment/.env.canary" và "deployment/deployment.canary.yaml" để deploy:
    # (Nếu chưa có 2 files này, dùng lệnh ở trên để generate: `dx deploy generate --env=canary`)
    dx deploy --env=canary --provider=gcloud --project=top-group-k8s --cluster=digitop-cluster
    ```

-   Deploy **MONOREPO** >> thêm flag `--app={APP_NAME}`

    ```bash
    # Deploy lên DEV3.DIGITOP.VN (Digital Ocean)
    dx deploy --app=di-examples
    ```

-   Một số lưu ý cho cấu hình `dx.json`:

    -   Cách thêm domain vào môi trường **DEVELOPMENT**:

        -   Mở `dx.json` và thêm vào domain vào mảng "cdn > staging"
            (VD: `{ cdn: { staging: ["example.com"] }, prod: [] }`)
        -   Chạy lệnh `dx deploy generate`

    -   Cách thêm domain vào môi trường **STAGING**:

        -   Mở `dx.json` và thêm vào domain vào mảng "cdn > staging"
            (VD: `{ cdn: { staging: ["example.com"] }, prod: [] }`)
        -   Chạy lệnh `dx deploy generate --staging`

    -   Cách thêm domain vào môi trường **PRODUCTION**:

        -   Mở `dx.json` và thêm vào domain vào mảng "cdn > prod"
            (VD: `{ cdn: { staging: [], prod: ["example.com"] } }`)
        -   Chạy lệnh `dx deploy generate --prod`
        -   Tạo pull request từ `nhánh-của-bạn` -> `master` -> `prod`

    -   Cách thêm domain vào môi trường **BẤT KỲ**: (giả sử: `canary`)
        -   Mở `dx.json` và thêm vào domain vào mảng "cdn > prod"
            (VD: `{ cdn: { staging: [], prod: [], canary: ["example.com"] } }`)
        -   Chạy lệnh `dx deploy generate --env=canary`
        -   Kiểm tra và chỉnh sửa file ENV nếu cần: "deployment/.env.canary"
        -   Tạo pull request từ `nhánh-của-bạn` -> `master` -> `canary`

## Google CDN Helper

-   Đẩy toàn bộ files trong thư mục "public" của dự án lên CDN (staging):

    ```
    dx cdn push
    ```

    hoặc upload thư mục bất kỳ với lệnh:

    ```
    dx cdn push <directory_path>
    ```

-   Đẩy toàn bộ files trong thư mục "public" lên CDN (production):

    ```
    dx cdn push --prod
    ```

    hoặc upload thư mục bất kỳ với lệnh:

    ```
    dx cdn push <directory_path> --prod
    ```

-   Xoá cache CDN (staging):

    ```
    dx cdn purge
    ```

-   Xoá cache CDN (production):

    ```
    dx cdn purge --prod
    ```

-   Kích hoạt CDN cho dự án (staging):

    ```
    dx cdn enable
    ```

-   Kích hoạt CDN cho dự án (production):

    ```
    dx cdn enable --prod
    ```

-   Bỏ kích hoạt CDN cho dự án (staging):

    ```
    dx cdn disable
    ```

-   Bỏ kích hoạt CDN cho dự án (production):
    ```
    dx cdn disable --prod
    ```

## DATABASE Helper (MongoDB)

-   Tạo database mới (DEV):

    ```
    # DEV3 MongoDB
    dx db new --dev --do

    # DEV1 MongoDB
    dx db new
    dx db new --dev
    ```

-   Tạo database mới (PROD):

    ```
    dx db new --prod
    dx db new --env=prod
    ```

-   Tạo auth user cho 1 database bất kỳ:

    ```
    dx db add-user <database> <username> <password> --do
    dx db add-user <database> <username> <password> --prod
    ```

-   **(!!! DANGER !!!)** Tạo default auth user cho 1 database bất kỳ với user/pass là `admin/Top@123#`

    ```
    dx db add-default-user <database>
    ```

## ANALYTICS Helper (GA4/GTAG)

-   Tạo mã tracking GTAG:

    ```
    dx analytics new

    // Examples:
    dx analytics new --prod
    dx analytics new --env=canary
    ```

## Bibucket Helper

-   Đăng nhập Bitbucket:

    ```
    dx git login
    ```

-   Đăng xuất Bitbucket:

    ```
    dx git logout
    ```

-   Kiểm tra tài khoản Bitbucket đang đăng nhập:

    ```
    dx git profile
    ```

-   **Tạo Pull Request**: (DESTINATION_BRANCH = optional, default là nhánh "master")

    từ current working branch tới master (hoặc nhánh nào đó)

    ```
    dx git pr <DESTINATION_BRANCH=master>
    ```

    hoặc từ FROM_BRANCH tới TO_BRANCH:

    ```
    dx git pr <FROM_BRANCH> <TO_BRANCH>
    ```

    tạo PR tới nhiều branch (dùng dấu phẩy):

    ```
    dx git pr <FROM_BRANCH> BRANCH_1,BRANCH_2,BRANCH_3
    ```

    tạo PR & auto merge (nếu ko conflicted - **ONLY ADMINISTRATOR LEVEL CAN DO THIS**):

    ```
    dx git pr <FROM_BRANCH> <TO_BRANCH> --merge
    ```

-   Kích hoạt **Bitbucket Pipeline** cho dự án:

    ```
    dx pipeline enable
    ```

-   Bỏ kích hoạt **Bitbucket Pipeline** cho dự án:
    ```
    dx pipeline disable
    ```
