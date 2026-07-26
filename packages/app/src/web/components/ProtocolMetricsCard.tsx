import useSWR from 'swr';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { TransportMetricsResponse } from '../../shared/transport-metrics.js';
import { ArrowRight, Network, Radio, Users, Waypoints } from 'lucide-react';
import { MetricTile, SectionHeader } from './DashboardPrimitives';
import { formatCompactNumber } from '../lib/dashboard-utils';

const fetcher = (url: string) =>
	fetch(url).then((response) => {
		if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
		return response.json();
	});

export function ProtocolMetricsCard() {
	const { data: metrics, error } = useSWR<TransportMetricsResponse>('/api/transport-metrics', fetcher, {
		refreshInterval: 3000,
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	if (error) {
		return <Card className="p-6 text-sm text-destructive">Failed to load protocol metrics: {error.message}</Card>;
	}
	if (!metrics) {
		return <Card className="p-6 text-sm text-muted-foreground">Loading protocol metrics…</Card>;
	}

	const totalRequests = metrics.protocolEras.legacy + metrics.protocolEras.modern;
	const modernShare = totalRequests === 0 ? 0 : Math.round((metrics.protocolEras.modern / totalRequests) * 100);
	const modernClients = metrics.clients.filter((client) =>
		client.protocols.some((protocol) => protocol.era === 'modern')
	).length;
	const migratingClients = metrics.clients.filter(
		(client) =>
			client.protocols.some((protocol) => protocol.era === 'modern') &&
			client.protocols.some((protocol) => protocol.era === 'legacy')
	).length;

	return (
		<div className="space-y-5">
			<SectionHeader
				title="Protocol migration"
				description="Follow client and authenticated-user adoption across exact MCP wire versions."
			/>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<MetricTile
					label="Modern traffic"
					value={`${modernShare}%`}
					detail={`${formatCompactNumber(metrics.protocolEras.modern)} requests`}
					icon={<Radio className="size-5" />}
					tone="green"
				/>
				<MetricTile
					label="Legacy traffic"
					value={`${100 - modernShare}%`}
					detail={`${formatCompactNumber(metrics.protocolEras.legacy)} requests`}
					icon={<Waypoints className="size-5" />}
					tone="amber"
				/>
				<MetricTile
					label="Modern clients"
					value={modernClients}
					detail={`${metrics.clients.length} total implementations`}
					icon={<Network className="size-5" />}
					tone="blue"
				/>
				<MetricTile
					label="Authenticated users"
					value={metrics.connections.uniqueUsers ?? 0}
					detail="Privacy-preserving unique count"
					icon={<Users className="size-5" />}
					tone="violet"
				/>
			</div>

			<Card className="overflow-hidden">
				<CardContent>
					<div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
						<div>
							<div className="mb-3 flex items-end justify-between">
								<div>
									<p className="text-sm font-semibold">Traffic adoption</p>
									<p className="text-sm text-muted-foreground">Share of all attributed MCP requests</p>
								</div>
								<p className="font-mono text-2xl font-semibold tracking-tight">{modernShare}%</p>
							</div>
							<div className="flex h-3 overflow-hidden rounded-full bg-amber-200">
								<div
									className="rounded-full bg-emerald-500 transition-[width] duration-500"
									style={{ width: `${modernShare}%` }}
								/>
							</div>
							<div className="mt-2 flex justify-between text-xs text-muted-foreground">
								<span>Modern · {metrics.protocolEras.modern}</span>
								<span>Legacy · {metrics.protocolEras.legacy}</span>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3 lg:min-w-64">
							<div className="rounded-full bg-violet-100 p-2 text-violet-700">
								<ArrowRight className="size-4" />
							</div>
							<div>
								<p className="font-mono text-lg font-semibold">{migratingClients}</p>
								<p className="text-xs text-muted-foreground">clients seen on both eras</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<SectionHeader
						title="Exact protocol versions"
						description="Wire-version adoption since this server process started."
					/>
					<div className="overflow-x-auto rounded-xl border">
						<Table className="min-w-[760px]">
							<TableHeader>
								<TableRow>
									<TableHead>Era</TableHead>
									<TableHead>Version</TableHead>
									<TableHead className="text-right">Requests</TableHead>
									<TableHead className="text-right">Clients</TableHead>
									<TableHead className="text-right">Users</TableHead>
									<TableHead className="text-right">Unattributed</TableHead>
									<TableHead>Last seen</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{metrics.protocolVersions.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
											No protocol traffic has been observed yet.
										</TableCell>
									</TableRow>
								) : (
									metrics.protocolVersions.map((protocol) => (
										<TableRow key={`${protocol.era}:${protocol.version}`}>
											<TableCell>
												<Badge variant={protocol.era === 'modern' ? 'success' : 'secondary'}>{protocol.era}</Badge>
											</TableCell>
											<TableCell className="font-mono">{protocol.version}</TableCell>
											<TableCell className="text-right font-mono">{protocol.requestCount}</TableCell>
											<TableCell className="text-right font-mono">{protocol.uniqueClients}</TableCell>
											<TableCell className="text-right font-mono">{protocol.uniqueUsers}</TableCell>
											<TableCell className="text-right font-mono">{protocol.unattributedRequests}</TableCell>
											<TableCell>{new Date(protocol.lastSeen).toLocaleString()}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<SectionHeader
						title="Clients by protocol"
						description="Implementation versions and every wire protocol observed from each client."
					/>
					<div className="overflow-x-auto rounded-xl border">
						<Table className="min-w-[700px]">
							<TableHeader>
								<TableRow>
									<TableHead>Client</TableHead>
									<TableHead>Protocols</TableHead>
									<TableHead className="text-right">Requests</TableHead>
									<TableHead className="text-right">Tool calls</TableHead>
									<TableHead className="text-right">Users</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{metrics.clients.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
											Clients will appear here after their first MCP request.
										</TableCell>
									</TableRow>
								) : (
									metrics.clients.map((client) => (
										<TableRow key={`${client.name}:${client.version}`}>
											<TableCell className="font-mono">
												{client.name}@{client.version}
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{client.protocols.map((protocol) => (
														<Badge
															key={`${protocol.era}:${protocol.version}`}
															variant={protocol.era === 'modern' ? 'success' : 'secondary'}
															title={`${protocol.requestCount} requests`}
														>
															{protocol.era} · {protocol.version}
														</Badge>
													))}
												</div>
											</TableCell>
											<TableCell className="text-right font-mono">{client.requestCount}</TableCell>
											<TableCell className="text-right font-mono">{client.toolCallCount}</TableCell>
											<TableCell className="text-right font-mono">{client.uniqueUserCount}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
