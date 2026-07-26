import useSWR from 'swr';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { TransportMetricsResponse } from '../../shared/transport-metrics.js';

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

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>🔀 Protocol Migration</CardTitle>
					<CardDescription>Request, client, and authenticated-user adoption by MCP protocol version.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<p className="text-sm text-muted-foreground">Legacy requests</p>
							<p className="text-2xl font-mono">{metrics.protocolEras.legacy}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Modern requests</p>
							<p className="text-2xl font-mono">{metrics.protocolEras.modern}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Unique authenticated users</p>
							<p className="text-2xl font-mono">{metrics.connections.uniqueUsers ?? 0}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Protocol versions</CardTitle>
					<CardDescription>Exact wire-version adoption since this server process started.</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
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
							{metrics.protocolVersions.map((protocol) => (
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
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Clients by protocol</CardTitle>
					<CardDescription>Implementation versions and every wire protocol observed from each client.</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
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
							{metrics.clients.map((client) => (
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
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
