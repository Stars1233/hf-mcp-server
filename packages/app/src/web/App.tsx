//import "./App.css";

import useSWR from 'swr';
import { TransportMetricsCard } from './components/TransportMetricsCard';
import { McpMethodsCard } from './components/McpMethodsCard';
import { ConnectionFooter } from './components/ConnectionFooter';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { Copy, Settings } from 'lucide-react';
import type { TransportInfo } from '../shared/transport-info.js';

// SWR fetcher function
const fetcher = (url: string) =>
	fetch(url).then((res) => {
		if (!res.ok) {
			throw new Error(`Failed to fetch: ${res.status}`);
		}
		return res.json();
	});

function App() {
	// Use SWR for transport info with auto-refresh
	const { data: transportInfo, error: transportError } = useSWR<TransportInfo>('/api/transport', fetcher, {
		refreshInterval: 3000, // Refresh every 3 seconds
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
	});

	// Use SWR for sessions to trigger stdioClient update
	useSWR('/api/sessions', fetcher, {
		refreshInterval: 3000, // Refresh every 3 seconds
		revalidateOnFocus: true,
	});

	const isLoading = !transportInfo && !transportError;
	const error = transportError ? transportError.message : null;

	// Handler for copying MCP URL
	const handleCopyMcpUrl = async () => {
		const mcpUrl = `https://huggingface.co/mcp`;

		try {
			await navigator.clipboard.writeText(mcpUrl);
		} catch (err) {
			console.error('Failed to copy URL:', err);
		}
	};

	// Handler for going to settings (switch to search tab)
	const handleGoToSettings = () => {
		window.open('https://huggingface.co/settings/mcp', '_blank');
	};

	return (
		<>
			<div className="min-h-screen p-4 sm:p-8 pb-20">
				<div className="max-w-4xl mx-auto">
					<Tabs defaultValue="metrics" className="w-full">
						<TabsList className="mb-6 w-full overflow-x-auto flex-nowrap">
							<TabsTrigger value="metrics" className="whitespace-nowrap">
								📊 Metrics
							</TabsTrigger>
							<TabsTrigger value="mcp" className="whitespace-nowrap">
								🔧 MCP
							</TabsTrigger>
							<TabsTrigger value="home" className="whitespace-nowrap">
								🏠 Home
							</TabsTrigger>
						</TabsList>
						<TabsContent value="metrics" className="mt-0">
							<TransportMetricsCard />
						</TabsContent>
						<TabsContent value="mcp" className="mt-0">
							<McpMethodsCard />
						</TabsContent>
						<TabsContent value="home" className="mt-0">
							{/* HF MCP Server Card */}
							<Card>
								<CardHeader>
									<CardTitle>🤗 HF MCP Server</CardTitle>
									<CardDescription>Connect with AI assistants through the Model Context Protocol</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* What's MCP Section */}
									<div>
										<h3 className="text-sm font-semibold text-foreground mb-3">What's MCP?</h3>
										<p className="text-sm text-muted-foreground leading-relaxed">
											The Model Context Protocol (MCP) is an open standard that enables AI assistants to securely
											connect to external data sources and tools. This HF MCP Server provides access to Hugging Face's
											ecosystem of models, datasets, and Spaces, allowing AI assistants to search, analyze, and interact
											with ML resources directly.
										</p>
									</div>

									<Separator />

									{/* Action Buttons */}
									<div className="flex flex-col gap-4">
										<Button
											size="xl"
											onClick={handleCopyMcpUrl}
											className="w-full transition-all duration-200 active:bg-green-500 active:border-green-500 touch-manipulation"
										>
											<Copy className="mr-2 h-5 w-5" />
											Copy MCP URL
										</Button>
										<Button
											size="xl"
											variant="outline"
											onClick={handleGoToSettings}
											className="w-full touch-manipulation"
										>
											<Settings className="mr-2 h-5 w-5" />
											Go to Settings
										</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			<ConnectionFooter isLoading={isLoading} error={error} transportInfo={transportInfo || { transport: 'unknown' }} />
		</>
	);
}

export default App;
