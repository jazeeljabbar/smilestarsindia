import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, FileText, Smile } from 'lucide-react';

export function Content() {
    const { data: content = [], isLoading } = useQuery({
        queryKey: ['/api/content/public'],
        queryFn: () => apiRequest('/content/public'),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-pink-100 rounded-full">
                    <Smile className="h-8 w-8 text-pink-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-pink-600">Twinky Corner</h1>
                    <p className="text-gray-600">Educational videos, articles, and fun facts for healthy smiles!</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(content) && content.map((item: any) => (
                    <Card key={item.id} className="hover:shadow-lg transition-shadow border-pink-100 overflow-hidden">
                        {item.thumbnailUrl && (
                            <div className="w-full h-48 overflow-hidden bg-gray-100">
                                <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover transition-transform hover:scale-105" />
                            </div>
                        )}
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant={item.type === 'VIDEO' ? 'default' : 'secondary'} className={item.type === 'VIDEO' ? 'bg-pink-500 hover:bg-pink-600' : ''}>
                                    {item.type}
                                </Badge>
                            </div>
                            <CardTitle className="mt-2 text-xl line-clamp-2">{item.title}</CardTitle>
                            <CardDescription className="line-clamp-3">{item.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full bg-pink-500 hover:bg-pink-600 text-white group"
                                onClick={() => {
                                    // In a real app, this might navigate to a details page or open a modal
                                    // For now, if we have a slug, we can assume a route exists or just show it here.
                                    // Ideally we navigate to /content/:slug
                                    window.location.href = `/content/${item.slug}`;
                                }}
                            >
                                {item.type === 'VIDEO' ? <PlayCircle className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                                Start Learning
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {content.length === 0 && (
                <div className="text-center py-20 bg-pink-50 rounded-2xl border-2 border-dashed border-pink-200">
                    <Smile className="h-16 w-16 text-pink-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-pink-800">Coming Soon!</h3>
                    <p className="text-pink-600 mt-2">More exciting content is being prepared for Twinky Corner.</p>
                </div>
            )}
        </div>
    );
}
