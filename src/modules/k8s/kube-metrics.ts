import axios from "axios";
import dayjs from "dayjs";
import { z } from "zod";

const MetricDataPointSchema = z.object({
	time: z.number(),
	value: z.number(),
	metric: z.object({
		pod: z.string().optional(),
		namespace: z.string().optional(),
	}),
});

const TimeSeriesMetricSchema = z.object({
	time: z.number(),
	memory: z.number(),
	cpu: z.number(),
	pod: z.string().optional(),
	namespace: z.string().optional(),
});

type MetricDataPoint = z.infer<typeof MetricDataPointSchema>;
type TimeSeriesMetric = z.infer<typeof TimeSeriesMetricSchema>;

export class KubernetesMetricsService {
	private prometheusUrl: string;

	constructor(prometheusUrl: string) {
		this.prometheusUrl = prometheusUrl;
	}

	async getMetricsTimeSeries(query: string, start: Date, end: Date, step: number = 60): Promise<TimeSeriesMetric[]> {
		try {
			const response = await axios.get(`${this.prometheusUrl}/api/v1/query_range`, {
				params: {
					query,
					start: dayjs(start).format(),
					end: dayjs(end).format(),
					step,
				},
			});

			const metrics: TimeSeriesMetric[] = response.data.data.result
				.map((result: MetricDataPoint) => {
					const parsedMetric = MetricDataPointSchema.parse(result);
					return {
						time: parsedMetric.time,
						memory: parseFloat(parsedMetric.value[1]),
						cpu: parseFloat(parsedMetric.value[1]),
						pod: parsedMetric.metric.pod,
						namespace: parsedMetric.metric.namespace,
					};
				})
				.map((metric) => TimeSeriesMetricSchema.parse(metric));

			return metrics;
		} catch (error) {
			console.error("Error fetching metrics:", error);
			return [];
		}
	}

	// Example method for memory metrics
	async getMemoryMetrics(): Promise<TimeSeriesMetric[]> {
		const end = new Date();
		const start = new Date(end.getTime() - 10 * 60000); // Last 10 minutes

		const memoryQuery = 'sum(container_memory_usage_bytes{namespace!=""}) by (pod, namespace) / 1024 / 1024';

		return this.getMetricsTimeSeries(memoryQuery, start, end);
	}
}
