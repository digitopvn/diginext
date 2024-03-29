import { homedir } from "os";
import path from "path";

export const DIGINEXT_DOMAIN = `diginext.site`;

export const HOME_DIR = homedir();
export const KUBECONFIG_DIR = path.resolve(HOME_DIR, ".kube");
export const KUBECONFIG_FILE = path.resolve(KUBECONFIG_DIR, "config");
export const SSH_DIR = path.resolve(HOME_DIR, ".ssh");

export const CLI_DIR = path.resolve(__dirname, "../../");
export const CLI_CONFIG_DIR = path.resolve(HOME_DIR, ".diginext");
export const CLI_CONFIG_FILE = path.resolve(CLI_CONFIG_DIR, "config.json");
export const STORAGE_DIR = path.resolve(CLI_DIR, "storage");
export const SYSTEM_LOG_DIR = path.resolve(STORAGE_DIR, "system_logs");

export const FULL_DEPLOYMENT_TEMPLATE_PATH = path.resolve(CLI_DIR, `templates/deployment.yaml`);
export const NAMESPACE_TEMPLATE_PATH = path.resolve(CLI_DIR, `templates/namespace.yaml`);
export const README_TEMPLATE_PATH = path.resolve(CLI_DIR, `templates/readme-template.md`);

export const DIGITOP_CDN_URL = `https://google-cdn.digitop.vn`;

export const ANALYTICS_SA_PATH = path.resolve(`keys/analytics-service-account.json`);

// DEFAULT
export const BUILD_ENV_PATH = path.resolve(CLI_DIR, `templates/.env`);
