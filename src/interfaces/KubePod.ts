export interface KubePod {
	apiVersion?: string;
	kind?: "Pod";
	metadata: {
		creationTimestamp?: string;
		generateName?: string;
		labels?: any;
		name?: string;
		namespace?: string;
		ownerReferences?: {
			apiVersion?: string;
			blockOwnerDeletion?: boolean;
			controller?: boolean;
			kind?: string;
			name?: string;
			uid?: string;
		}[];
		resourceVersion?: string;
		uid?: string;
	};
	spec?: {
		containers?: {
			args?: string[];
			env?: {
				name?: string;
				value?: string;
				valueFrom?: {
					fieldRef?: {
						apiVersion?: string;
						fieldPath?: string;
					};
				};
			}[];
			image?: string;
			imagePullPolicy?: "IfNotPresent" | "Always" | "Never";
			lifecycle?: {
				preStop?: {
					exec?: {
						command?: string[];
					};
				};
			};
			livenessProbe?: {
				failureThreshold?: number;
				httpGet?: {
					path?: string;
					port?: number;
					scheme?: string;
				};
				initialDelaySeconds?: number;
				periodSeconds?: number;
				successThreshold?: number;
				timeoutSeconds?: number;
			};
			name?: string;
			ports?: {
				containerPort?: number;
				name?: string;
				protocol?: string;
			}[];
			readinessProbe?: {
				failureThreshold?: number;
				httpGet?: {
					path?: string;
					port?: number;
					scheme?: string;
				};
				initialDelaySeconds?: number;
				periodSeconds?: number;
				successThreshold?: number;
				timeoutSeconds?: number;
			};
			resources?: {
				requests?: {
					cpu?: string;
					memory?: string;
				};
				limit?: {
					cpu?: string;
					memory?: string;
				};
			};
			securityContext?: {
				allowPrivilegeEscalation?: boolean;
				capabilities?: {
					add?: string[];
					drop?: string[];
				};
				runAsUser?: string | number;
			};
			terminationMessagePath?: string;
			terminationMessagePolicy?: string;
			volumeMounts?: {
				mountPath?: string;
				name?: string;
				readOnly?: boolean;
			}[];
		}[];
		dnsPolicy?: string;
		enableServiceLinks?: boolean;
		nodeName?: string;
		nodeSelector?: Record<string, string>;
		preemptionPolicy?: string;
		priority?: number;
		restartPolicy?: "Always";
		schedulerName?: string;
		securityContext?: {};
		serviceAccount?: string;
		serviceAccountName?: string;
		terminationGracePeriodSeconds?: number;
		tolerations?: {
			effect?: string;
			key?: string;
			operator?: string;
			tolerationSeconds?: number;
		}[];
		volumes?: {
			name?: string;
			projected?: any;
			secret?: {
				defaultMode?: number;
				secretName?: string;
			};
		}[];
	};
	status?: {
		conditions?: {
			lastProbeTime?: string;
			lastTransitionTime?: string;
			status?: "True" | "False";
			type?: "Initialized" | "Ready" | "ContainersReady" | "PodScheduled" | "PodHasNetwork";
		}[];
		containerStatuses?: {
			containerID?: string;
			image?: string;
			imageID?: string;
			lastState?: {
				terminated?: {
					containerID?: string;
					exitCode?: number;
					finishedAt?: string;
					reason?: string;
					startedAt?: string;
				};
			};
			name?: string;
			ready?: boolean;
			restartCount?: number;
			started?: boolean;
			state?: {
				running?: {
					startedAt?: string;
				};
			};
		}[];
		hostIP?: string;
		phase?: "Running" | "Pending" | "Succeeded" | "Failed" | "Unknown";
		podIP?: string;
		podIPs?: { ip?: string }[];
		qosClass?: string;
		startTime?: string;
	};
	// extras
	clusterShortName?: string;
	/**
	 * Cluster ID
	 */
	cluster?: string;
	/**
	 * Workspace ID
	 */
	workspace?: string;
}
